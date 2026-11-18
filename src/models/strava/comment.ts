import {SummaryAthlete} from '.';

export interface Comment {
  id: string;
  activity_id: string;
  text: string;
  athlete: SummaryAthlete;
  created_at: Date;
  // Not in Strava's documentation, but in its answers: the comment's likes, and whether the
  // rider liked it.
  reaction_count?: number;
  has_reacted?: boolean;
}
