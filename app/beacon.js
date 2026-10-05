// The beacon as received: a prime-numbered preamble, then 667 bits. 667 = 23 × 29, both prime, so there are
// only two ways to fold it into a rectangle, and one of them is a picture.
// Proposed canon: what the picture shows is a first draft (their star and its one planet, a dish, the hydrogen line).

export const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
export const WIDTH = 23;
export const HEIGHT = 29;

const ROWS = [
  '.......................',
  '..........#..#..#..#...',
  '....#..#........#..#...',
  '.#.....#.....#.....#...',
  '.......................',
  '.#..#..#..#..#..#..#...',
  '.......................',
  '...###.................',
  '..#####.........###....',
  '.#######.......#...#...',
  '.#######.......#.#.#...',
  '.#######.......#...#...',
  '..#####.........###....',
  '...###.................',
  '.......................',
  '.......................',
  '..#...#................',
  '..#...#......#.........',
  '...#.#...#....#........',
  '....#.....#....#.......',
  '....#.....#....#.......',
  '....#.....#....#.......',
  '...###...#....#........',
  '.............#.........',
  '.......................',
  '.......................',
  '......#................',
  '.....###..##..###......',
  '...............#.......',
];

// The 667 bits in the order they arrive.
export const BITS = ROWS.join('').split('').map((c) => (c === '#' ? 1 : 0));

// What each part of the picture is, for the caption: [first row, last row, key].
export const PARTS = [
  [1, 5, 'count'],
  [7, 13, 'system'],
  [16, 23, 'dish'],
  [26, 28, 'hydrogen'],
];
