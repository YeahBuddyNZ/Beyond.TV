package nz.gobeyond.tv;

import java.nio.charset.StandardCharsets;

/**
 * A QR code for a short address, so a phone can open a page the TV serves (PhotosActivity, ADR 0061). Byte mode,
 * medium error correction, versions 1 to 10 (up to 213 bytes). Follows ISO/IEC 18004 the way Project Nayuki's
 * public domain generator lays it out. Plain Java, no Android: tests/PhotoDropTest.java checks it.
 */
final class Qr {
    private Qr() {}

    private static final int[] ECC_PER_BLOCK = {-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26};
    private static final int[] BLOCKS = {-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5};
    /** Medium error correction's format bits. */
    private static final int FORMAT_M = 0;

    /** The code for text: modules[y][x], true is dark. Null when it's too long for version 10. */
    static boolean[][] encode(String text) {
        byte[] data = text.getBytes(StandardCharsets.UTF_8);
        int version = 1;
        while (version <= 10 && dataCodewords(version) < 2 + (version >= 10 ? 1 : 0) + data.length) version++;
        if (version > 10) return null;
        int capacity = dataCodewords(version);

        // Mode, length, the bytes, a terminator, then padding to fill the version.
        Bits bits = new Bits(capacity * 8);
        bits.add(4, 4);
        bits.add(data.length, version >= 10 ? 16 : 8);
        for (byte b : data) bits.add(b & 0xFF, 8);
        bits.add(0, Math.min(4, capacity * 8 - bits.length));
        bits.add(0, (8 - bits.length % 8) % 8);
        for (int pad = 0xEC; bits.length < capacity * 8; pad ^= 0xEC ^ 0x11) bits.add(pad, 8);
        byte[] codewords = interleave(bits.bytes(), version);

        int size = version * 4 + 17;
        boolean[][] best = null;
        int bestPenalty = Integer.MAX_VALUE;
        for (int mask = 0; mask < 8; mask++) {
            Grid g = new Grid(size);
            g.functionPatterns(version);
            g.place(codewords);
            g.mask(mask);
            g.format(mask);
            int p = g.penalty();
            if (p < bestPenalty) {
                bestPenalty = p;
                best = g.dark;
            }
        }
        return best;
    }

    private static int rawModules(int version) {
        int result = (16 * version + 128) * version + 64;
        if (version >= 2) {
            int align = version / 7 + 2;
            result -= (25 * align - 10) * align - 55;
            if (version >= 7) result -= 36;
        }
        return result;
    }

    static int dataCodewords(int version) {
        return rawModules(version) / 8 - ECC_PER_BLOCK[version] * BLOCKS[version];
    }

    /** Splits the data into blocks, adds each one's Reed-Solomon codewords, and interleaves them. */
    private static byte[] interleave(byte[] data, int version) {
        int blocks = BLOCKS[version], ecc = ECC_PER_BLOCK[version], raw = rawModules(version) / 8;
        int shortBlocks = blocks - raw % blocks, shortLen = raw / blocks;
        byte[] divisor = divisor(ecc);
        byte[][] all = new byte[blocks][];
        for (int i = 0, k = 0; i < blocks; i++) {
            int len = shortLen - ecc + (i < shortBlocks ? 0 : 1);
            byte[] dat = new byte[len];
            System.arraycopy(data, k, dat, 0, len);
            k += len;
            byte[] rem = remainder(dat, divisor);
            byte[] block = new byte[shortLen + 1];
            System.arraycopy(dat, 0, block, 0, len);
            System.arraycopy(rem, 0, block, block.length - ecc, ecc);
            all[i] = block;
        }
        byte[] out = new byte[raw];
        int n = 0;
        for (int i = 0; i < all[0].length; i++) {
            for (int j = 0; j < blocks; j++) {
                // The short blocks' empty slot is skipped.
                if (i != shortLen - ecc || j >= shortBlocks) out[n++] = all[j][i];
            }
        }
        return out;
    }

    private static byte[] divisor(int degree) {
        byte[] result = new byte[degree];
        result[degree - 1] = 1;
        int root = 1;
        for (int i = 0; i < degree; i++) {
            for (int j = 0; j < degree; j++) {
                result[j] = (byte) multiply(result[j] & 0xFF, root);
                if (j + 1 < degree) result[j] ^= result[j + 1];
            }
            root = multiply(root, 0x02);
        }
        return result;
    }

    private static byte[] remainder(byte[] data, byte[] divisor) {
        byte[] result = new byte[divisor.length];
        for (byte b : data) {
            int factor = (b ^ result[0]) & 0xFF;
            System.arraycopy(result, 1, result, 0, result.length - 1);
            result[result.length - 1] = 0;
            for (int i = 0; i < result.length; i++) result[i] ^= (byte) multiply(divisor[i] & 0xFF, factor);
        }
        return result;
    }

    private static int multiply(int x, int y) {
        int z = 0;
        for (int i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11D);
            z ^= ((y >>> i) & 1) * x;
        }
        return z & 0xFF;
    }

    private static final class Bits {
        final byte[] buf;
        int length;

        Bits(int capacity) { buf = new byte[(capacity + 7) / 8 + 4]; }

        void add(int value, int count) {
            for (int i = count - 1; i >= 0; i--, length++) {
                if (((value >>> i) & 1) != 0) buf[length >>> 3] |= (byte) (0x80 >>> (length & 7));
            }
        }

        byte[] bytes() {
            byte[] out = new byte[length / 8];
            System.arraycopy(buf, 0, out, 0, out.length);
            return out;
        }
    }

    private static final class Grid {
        final int size;
        final boolean[][] dark, fixed;

        Grid(int size) {
            this.size = size;
            dark = new boolean[size][size];
            fixed = new boolean[size][size];
        }

        void set(int x, int y, boolean on) {
            dark[y][x] = on;
            fixed[y][x] = true;
        }

        void functionPatterns(int version) {
            for (int i = 0; i < size; i++) {
                set(6, i, i % 2 == 0);
                set(i, 6, i % 2 == 0);
            }
            finder(3, 3);
            finder(size - 4, 3);
            finder(3, size - 4);
            int[] align = alignment(version);
            for (int i = 0; i < align.length; i++) {
                for (int j = 0; j < align.length; j++) {
                    boolean corner = (i == 0 && j == 0) || (i == 0 && j == align.length - 1) || (i == align.length - 1 && j == 0);
                    if (corner) continue;
                    for (int dy = -2; dy <= 2; dy++) {
                        for (int dx = -2; dx <= 2; dx++) set(align[i] + dx, align[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
                    }
                }
            }
            format(0);   // reserves the format areas; the real bits come after masking
            if (version >= 7) {
                int rem = version;
                for (int i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
                long bits = (long) version << 12 | rem;
                for (int i = 0; i < 18; i++) {
                    boolean bit = ((bits >>> i) & 1) != 0;
                    int a = size - 11 + i % 3, b = i / 3;
                    set(a, b, bit);
                    set(b, a, bit);
                }
            }
        }

        private void finder(int x, int y) {
            for (int dy = -4; dy <= 4; dy++) {
                for (int dx = -4; dx <= 4; dx++) {
                    int dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
                    if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, dist != 2 && dist != 4);
                }
            }
        }

        private int[] alignment(int version) {
            if (version == 1) return new int[0];
            int n = version / 7 + 2;
            int step = (version * 8 + n * 3 + 5) / (n * 4 - 4) * 2;
            int[] out = new int[n];
            out[0] = 6;
            for (int i = n - 1, pos = size - 7; i >= 1; i--, pos -= step) out[i] = pos;
            return out;
        }

        void format(int mask) {
            int data = FORMAT_M << 3 | mask, rem = data;
            for (int i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            int bits = (data << 10 | rem) ^ 0x5412;
            for (int i = 0; i <= 5; i++) set(8, i, bit(bits, i));
            set(8, 7, bit(bits, 6));
            set(8, 8, bit(bits, 7));
            set(7, 8, bit(bits, 8));
            for (int i = 9; i < 15; i++) set(14 - i, 8, bit(bits, i));
            for (int i = 0; i < 8; i++) set(size - 1 - i, 8, bit(bits, i));
            for (int i = 8; i < 15; i++) set(8, size - 15 + i, bit(bits, i));
            set(8, size - 8, true);
        }

        private static boolean bit(int x, int i) { return ((x >>> i) & 1) != 0; }

        void place(byte[] data) {
            int i = 0;
            for (int right = size - 1; right >= 1; right -= 2) {
                if (right == 6) right = 5;
                for (int vert = 0; vert < size; vert++) {
                    for (int j = 0; j < 2; j++) {
                        int x = right - j;
                        boolean upward = ((right + 1) & 2) == 0;
                        int y = upward ? size - 1 - vert : vert;
                        if (!fixed[y][x] && i < data.length * 8) {
                            dark[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) != 0;
                            i++;
                        }
                    }
                }
            }
        }

        void mask(int m) {
            for (int y = 0; y < size; y++) {
                for (int x = 0; x < size; x++) {
                    boolean flip;
                    switch (m) {
                        case 0: flip = (x + y) % 2 == 0; break;
                        case 1: flip = y % 2 == 0; break;
                        case 2: flip = x % 3 == 0; break;
                        case 3: flip = (x + y) % 3 == 0; break;
                        case 4: flip = (x / 3 + y / 2) % 2 == 0; break;
                        case 5: flip = x * y % 2 + x * y % 3 == 0; break;
                        case 6: flip = (x * y % 2 + x * y % 3) % 2 == 0; break;
                        default: flip = ((x + y) % 2 + x * y % 3) % 2 == 0; break;
                    }
                    if (!fixed[y][x] && flip) dark[y][x] = !dark[y][x];
                }
            }
        }

        /** Long runs, 2 by 2 blocks and an uneven balance of dark and light cost points: the lowest-scoring mask wins. */
        int penalty() {
            int score = 0, darkCount = 0;
            for (int a = 0; a < size; a++) {
                int runRow = 1, runCol = 1;
                for (int b = 1; b < size; b++) {
                    if (dark[a][b] == dark[a][b - 1]) runRow++;
                    else {
                        if (runRow >= 5) score += runRow - 2;
                        runRow = 1;
                    }
                    if (dark[b][a] == dark[b - 1][a]) runCol++;
                    else {
                        if (runCol >= 5) score += runCol - 2;
                        runCol = 1;
                    }
                }
                if (runRow >= 5) score += runRow - 2;
                if (runCol >= 5) score += runCol - 2;
            }
            for (int y = 0; y < size; y++) {
                for (int x = 0; x < size; x++) {
                    if (dark[y][x]) darkCount++;
                    if (x + 1 < size && y + 1 < size && dark[y][x] == dark[y][x + 1] && dark[y][x] == dark[y + 1][x]
                            && dark[y][x] == dark[y + 1][x + 1]) score += 3;
                }
            }
            int total = size * size;
            int uneven = (Math.abs(darkCount * 20 - total * 10) + total - 1) / total - 1;
            score += Math.max(0, uneven) * 10;
            return score;
        }
    }
}
