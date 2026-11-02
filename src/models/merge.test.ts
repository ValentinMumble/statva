import {buildActivity} from '../../test/test-util';
import {mergePlan, messagePieces} from './merge';
import {ActivityType} from './strava';

const part = (id: number, start: string, minutes: number, km: number, sport = ActivityType.Ride) =>
  buildActivity({
    id,
    sport_type: sport,
    start_date: start,
    elapsed_time: minutes * 60,
    moving_time: minutes * 60,
    distance: km * 1000,
  });

describe('merge plan', () => {
  it('puts the parts in time order, adds them up and measures the stops between them', () => {
    const plan = mergePlan([part(2, '2026-10-28T14:30:00Z', 20, 8), part(1, '2026-10-28T14:00:00Z', 25, 10)]);

    expect(plan.parts.map(({id}) => id)).toEqual([1, 2]);
    expect(plan.distance).toBe(18000);
    expect(plan.movingTime).toBe(45 * 60);
    expect(plan.elapsedTime).toBe(50 * 60);
    expect(plan.gaps).toEqual([5 * 60]);
    expect(plan).toMatchObject({overlaps: false, mixedSports: false});
  });

  it('notices parts that overlap, and parts of different sports', () => {
    const plan = mergePlan([
      part(1, '2026-10-28T14:00:00Z', 25, 10),
      part(2, '2026-10-28T14:20:00Z', 10, 2, ActivityType.Run),
    ]);

    expect(plan).toMatchObject({overlaps: true, mixedSports: true});
  });
});

describe('Strava message about an upload', () => {
  it('cuts out the activities it names, as a link or as an id', () => {
    expect(messagePieces("merge.tcx duplicate of <a href='/activities/1234' target='_blank'>Morning Ride</a>")).toEqual(
      [{text: 'merge.tcx duplicate of '}, {id: 1234, name: 'Morning Ride'}],
    );
    expect(messagePieces('merge.tcx duplicate of activity 1001.')).toEqual([
      {text: 'merge.tcx duplicate of '},
      {id: 1001, name: 'activity 1001'},
      {text: '.'},
    ]);
    expect(messagePieces('Bad file')).toEqual([{text: 'Bad file'}]);
  });
});
