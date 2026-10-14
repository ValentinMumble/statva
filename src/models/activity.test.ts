import {buildActivity, buildDetailedActivity, TEST_CLUB} from '../../test/test-util';
import {
  calculateRunCalories,
  calculateSwimCalories,
  extractFinish,
  daysExceedingDistance,
  eddingtonNumber,
  extractNPGroup,
  formatLaps,
  getRidesBetween,
  getTypes,
  getWorkoutType,
} from '.';
import {ActivityType, WorkoutType} from './strava';

describe('getTypes', () => {
  test.each([
    [ActivityType.Ride, [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide]],
    [ActivityType.Run, [ActivityType.Run, ActivityType.TrailRun]],
    [ActivityType.Tennis, [ActivityType.Tennis]],
  ])('it can get matching types from an ActivityType', (type, expected) => {
    expect(getTypes(type)).toEqual(expected);
  });

  test.each([
    ['Ride', [ActivityType.Ride, ActivityType.GravelRide, ActivityType.VirtualRide]],
    ['Swim', [ActivityType.Swim]],
  ])('it can get matching types from a string', (type, expected) => {
    expect(getTypes(type)).toEqual(expected);
  });

  test('it can get matching types from multiple types', () => {
    expect(getTypes('Swim', 'Tennis')).toEqual([ActivityType.Swim, ActivityType.Tennis]);
    expect(getTypes('Swim', ActivityType.Tennis, 'Swim')).toEqual([ActivityType.Swim, ActivityType.Tennis]);
    expect(getTypes(...['Swim', ActivityType.Tennis, 'Swim'])).toEqual([ActivityType.Swim, ActivityType.Tennis]);
  });
});

describe('getWorkoutTypes', () => {
  test.each([
    [ActivityType.Ride, 10, WorkoutType.None],
    [ActivityType.Ride, 11, WorkoutType.Race],
    [ActivityType.Ride, 12, WorkoutType.Workout],
    [ActivityType.Run, 0, WorkoutType.None],
    [ActivityType.Run, 1, WorkoutType.Race],
    [ActivityType.Run, 2, WorkoutType.LongRun],
    [ActivityType.Run, 3, WorkoutType.Workout],
    [ActivityType.Swim, 0, WorkoutType.None],
  ])('it can get the workout type for a each type', (type, workout_type, expected) => {
    expect(getWorkoutType(buildActivity({type, workout_type}))).toEqual(expected);
  });
});

describe('formatting', () => {
  test.each([
    [250, 'Natation Petit Port', '10 laps'],
    [250, 'Natation Léo Lagrange', '5 laps'],
    [250, 'Natation Dervallières', '10 laps'],
    [250, 'Natation unknown', '? laps'],
  ])('it can format laps for a Swim activity', (distance, name, expected) => {
    expect(formatLaps(buildActivity({distance, name}))).toEqual(expected);
  });
});

describe('eddington', () => {
  test('it can compute eddington number and how many ride above 0 are needed for next level', () => {
    expect(eddingtonNumber([])).toEqual([0, 1]);
  });

  test('it can compute eddington number and how many ride above 2 are needed for next level', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 2000}),
      buildActivity({start_date: '2021-10-02', distance: 2000}),
    ];

    expect(eddingtonNumber(rides)).toEqual([2, 3]);
  });

  test('it can compute eddington number and how many ride above 5 are needed for next level', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 6000}),
      buildActivity({start_date: '2021-10-02', distance: 6000}),
      buildActivity({start_date: '2021-10-03', distance: 5000}),
      buildActivity({start_date: '2021-10-04', distance: 5000}),
      buildActivity({start_date: '2021-10-05', distance: 5000}),
    ];

    expect(eddingtonNumber(rides)).toEqual([5, 4]);
  });

  test('it can compute eddington number by day', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 2000}),
      buildActivity({start_date: '2021-10-01', distance: 2000}),
      buildActivity({start_date: '2021-10-02', distance: 4000}),
      buildActivity({start_date: '2021-10-03', distance: 4000}),
      buildActivity({start_date: '2021-10-04', distance: 4000}),
    ];

    expect(eddingtonNumber(rides)).toEqual([4, 5]);
  });
});

describe('getRidesBetween', () => {
  test('it can filter rides that happened only between the 2 given dates (from included, to excluded', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01'}),
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
      buildActivity({start_date: '2021-10-04'}),
    ];

    expect(getRidesBetween(rides, new Date('2021-10-02'), new Date('2021-10-04'))).toEqual([
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
    ]);
  });

  test('it can filter rides that happened only between a from date and today (excluded) if no to provided', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01'}),
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
      buildActivity({start_date: '2021-10-04'}),
    ];

    expect(getRidesBetween(rides, new Date('2021-10-02T12:00:00.000+01:00'))).toEqual([
      buildActivity({start_date: '2021-10-02'}),
      buildActivity({start_date: '2021-10-03'}),
      buildActivity({start_date: '2021-10-04'}),
    ]);
  });
});

describe('daysExceedingDistance', () => {
  test('it can get the count of days by distance', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 6000}),
      buildActivity({start_date: '2021-10-02', distance: 6000}),
      buildActivity({start_date: '2021-10-03', distance: 5000}),
      buildActivity({start_date: '2021-10-04', distance: 4000}),
      buildActivity({start_date: '2021-10-05', distance: 5000}),
    ];

    expect(daysExceedingDistance(rides)).toEqual({
      1: 5,
      2: 5,
      3: 5,
      4: 5,
      5: 4,
      6: 2,
    });
  });

  test('it can get the count of days by distance', () => {
    const rides = [
      buildActivity({start_date: '2021-10-01', distance: 6000}),
      buildActivity({start_date: '2021-10-01', distance: 1000}),
      buildActivity({start_date: '2021-10-02', distance: 3000}),
      buildActivity({start_date: '2021-10-04', distance: 4000}),
      buildActivity({start_date: '2021-10-05', distance: 5000}),
    ];

    expect(daysExceedingDistance(rides)).toEqual({
      1: 4,
      2: 4,
      3: 4,
      4: 3,
      5: 2,
      6: 1,
      7: 1,
    });
  });
});

describe.skip('calculateRunCalories', () => {
  test.each([
    [74, 2336, 846, 142.2, 218],
    [74, 2540.9, 936, 142.4, 234],
    [74, 4029.3, 1313, 146, 266],
    [74, 3284.3, 1074, 141.5, 304],
    [74, 5087.1, 1699, 152.1, 350],
    [74, 5300.9, 1670, 159.3, 371],
    [74, 6152.3, 1805, 163.3, 416],
    [74, 5022.9, 1403, 166.5, 457],
    [74, 5072.6, 1601, 151.6, 467],
    [74, 5213.9, 1695, 153.9, 486],
    [74, 7778.2, 2462, 150.6, 510],
    [74, 6283, 1738, 161.9, 582],
    [74, 6309.5, 2041, 150.8, 584],
    [74, 8567.2, 2420, 166.4, 586],
    [74, 6662, 2091, 153, 613],
    [74, 6667.1, 1895, 162.9, 615],
    [74, 7042.2, 2169, 154.1, 642],
    [74, 7276.5, 2059, 157.2, 670],
    [74, 7528.4, 2228, 166.4, 685],
    [74, 10398.2, 3171, 153.8, 687],
    [74, 7694.3, 2152, 165.8, 700],
    [74, 7688.5, 2174, 163.3, 708],
    [74, 7808.9, 2265, 160.8, 717],
    [74, 12078, 3710, 159.7, 795],
    [74, 10050.6, 2908, 164.9, 923],
    [74, 13127.6, 4387, 152.7, 929],
    [74, 10118.3, 3201, 154.2, 936],
    [74, 10241.2, 2979, 167.4, 936],
    [74, 13124.6, 3867, 160.7, 942],
    [74, 10657.8, 3146, 159.8, 989],
    [74, 15291.1, 5129, 153.4, 1060],
  ])('it can calculate calories for a run', (weight, movingTime, distance, average_heartrate, expected) => {
    expect(calculateRunCalories(weight, movingTime, distance, average_heartrate)).toEqual(expected);
  });
});

describe.skip('calculateSwimCalories', () => {
  test.each([
    [74, 1560, 1100, 149, 358],
    [74, 1858, 1300, 149, 430],
    [74, 1696, 1200, 147, 325],
    [74, 2218, 1500, 150, 509],
  ])('it can calculate calories for a swim', (weight, movingTime, distance, average_heartrate, expected) => {
    expect(calculateSwimCalories(weight, movingTime, distance, average_heartrate)).toEqual(expected);
  });
});

describe('extractNPGroup', () => {
  test.each([
    ['N-Peloton #575 G2', 'G2'],
    ['N-Peloton #561 G2 préchauffé 🎸', 'G2'],
    ['N-Peloton #550 G2.3', 'G2.3'],
    ['N-Peloton #540 Chill 1', 'C1'],
    ['N-Peloton #530 G3 précramé', 'G3'],
    ['N-Peloton #520 G1 🏴‍☠️', 'Pirate'],
    ['N-Peloton #510 🏴‍☠️', 'Pirate'],
    ['Random ride name', 'Unknown'],
  ])('extractNPGroup(%s) = %s', (name, expected) => {
    expect(extractNPGroup(name, undefined, TEST_CLUB)).toBe(expected);
  });

  test.each([
    ['N-Peloton #575 G2', 'Sortie pirate ce matin', 'Pirate'],
    ['N-Peloton #575 G2', 'On etait en Pirate', 'Pirate'],
    ['N-Peloton #575 G2', 'PIRATE', 'Pirate'],
    ['N-Peloton #575 G2', 'Avec les pirates', 'Pirate'],
    ['N-Peloton #575 G2', 'Avec les 🏴‍☠️', 'Pirate'],
    ['N-Peloton #670 🍍', 'Sortie Pirate', 'Pirate'],
    ['N-Peloton #575 G2', 'Grosse sortie tranquille', 'G2'],
    ['N-Peloton #575 G2', 'On a fait du piratage de roue', 'G2'],
    ['N-Peloton #575 G2', '', 'G2'],
  ])('extractNPGroup(%s) with a description saying "%s" = %s', (name, description, expected) => {
    expect(extractNPGroup(name, buildDetailedActivity({description}), TEST_CLUB)).toBe(expected);
  });

  test.each([
    ['N-Peloton #575 G2', 'Pirate', 'Pirate'],
    ['N-Peloton #670 🍍', '🏴‍☠️', 'Pirate'],
    ['N-Peloton #575 G2', 'NP: 211', 'G2'],
  ])('extractNPGroup(%s) with a private note saying "%s" = %s', (name, privateNote, expected) => {
    expect(extractNPGroup(name, buildDetailedActivity({private_note: privateNote, description: ''}), TEST_CLUB)).toBe(expected);
  });

  test.each([
    ['N-Peloton #670 🍍 pirate', 'Pirate'],
    ['N-Peloton #670 🍊', 'PCC'],
    ['N-Peloton #670 🍍', 'Unknown'],
  ])('extractNPGroup(%s) without any meta = %s', (name, expected) => {
    expect(extractNPGroup(name, undefined, TEST_CLUB)).toBe(expected);
  });

  test.each([
    ['N-Peloton #575 G2', 'Avec le 🍊', 'PCC'],
    ['N-Peloton #670 🍍', 'Sortie 🍊 tranquille', 'PCC'],
    ['N-Peloton #575 G2 🍊', '', 'PCC'],
    ['N-Peloton #575 G2 🍊', '🏴‍☠️', 'Pirate'],
  ])('extractNPGroup(%s) with "%s" in the notes = %s', (name, note, expected) => {
    expect(extractNPGroup(name, buildDetailedActivity({description: note}), TEST_CLUB)).toBe(expected);
    expect(extractNPGroup(name, buildDetailedActivity({private_note: note, description: ''}), TEST_CLUB)).toBe(expected);
  });
});

describe('extractFinish', () => {
  test('it reads where a ride finished, however it was written', () => {
    const rides = [
      buildDetailedActivity({description: "Finish Caf'K"}),
      buildDetailedActivity({description: 'Finish Zazou'}),
      buildDetailedActivity({description: "Finish caf'k"}),
      buildDetailedActivity({description: "Finish au Caf'K"}),
      buildDetailedActivity({description: 'Finish belle de jour'}),
      buildDetailedActivity({description: 'Finish Belle de Jour'}),
      buildDetailedActivity({description: 'Finish Laloko'}),
      buildDetailedActivity({description: 'Finish à Laloko'}),
      buildDetailedActivity({description: "Finish à l'équipe"}),
      buildDetailedActivity({description: "Finish l'équipe"}),
      buildDetailedActivity({description: "Finish l'Atlantide"}),
      buildDetailedActivity({description: 'Finish à La Générale\nBlablab'}),
      buildDetailedActivity({description: 'Finish à l’Atomics'}),
      buildDetailedActivity({description: 'Finish à l’atomics'}),
      buildDetailedActivity({description: "Finish à l'Atomics"}),
      buildDetailedActivity({description: 'Finish Atomics'}),
      buildDetailedActivity({description: `🥰
Finish au Chemin de Traverse`}),
    ];

    expect(rides.map(ride => extractFinish(ride))).toEqual([
      "Caf'K",
      'Zazou',
      "Caf'K",
      "Caf'K",
      'Belle De Jour',
      'Belle De Jour',
      'Laloko',
      'Laloko',
      'Équipe',
      'Équipe',
      'Atlantide',
      'Générale',
      'Atomics',
      'Atomics',
      'Atomics',
      'Atomics',
      'Chemin De Traverse',
    ]);
    expect(extractFinish(buildDetailedActivity({description: 'No finish line here'}))).toBeNull();
  });
});
