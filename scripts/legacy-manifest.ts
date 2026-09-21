/**
 * Frozen snapshot of the old lib/stories.ts manifest.
 *
 * The database is the source of truth for story content now. This file exists
 * only so scripts/import-existing-content.ts stays runnable — it is what maps
 * the files still sitting in public/audio/ onto Story and Clip rows. Once the
 * bucket upload has been verified in production, this and public/audio/ can
 * both be deleted.
 */
export type Voice = "male" | "female";

export interface StoryClip {
  id: string;
  storyNumber: number;
  title: string;
  take: number;
  maleFile: string;
  femaleFile: string;
  /** Was part of the live delivery sequence; becomes status "live". */
  active: boolean;
  index?: number;
  isFreeTrialEnd?: boolean;
  isChargeStart?: boolean;
}

export const STORY_CLIPS: StoryClip[] = [
  {
    id: "000-welcome",
    storyNumber: 0,
    title: "Welcome",
    take: 1,
    maleFile: "000-welcome.mp3",
    femaleFile: "000-welcome.mp3",
    active: true,
    index: 0,
  },
  {
    id: "001-zechariah-take1",
    storyNumber: 1,
    title: "Zechariah",
    take: 1,
    maleFile: "001-zechariah-take1.mp3",
    femaleFile: "001-zechariah-take1.mp3",
    active: false,
  },
  {
    id: "001-zechariah-take2",
    storyNumber: 1,
    title: "Zechariah",
    take: 2,
    maleFile: "001-zechariah-take2.mp3",
    femaleFile: "001-zechariah-take2.mp3",
    active: false,
  },
  {
    id: "001-zechariah-take3",
    storyNumber: 1,
    title: "Zechariah",
    take: 3,
    maleFile: "001-zechariah-take3.mp3",
    femaleFile: "001-zechariah-take3.mp3",
    active: true,
    index: 1,
  },
  {
    id: "002-mary-and-angel-take1",
    storyNumber: 2,
    title: "Mary and the Angel",
    take: 1,
    maleFile: "002-mary-and-angel-take1.mp3",
    femaleFile: "002-mary-and-angel-take1.mp3",
    active: false,
  },
  {
    id: "002-mary-and-angel-take2",
    storyNumber: 2,
    title: "Mary and the Angel",
    take: 2,
    maleFile: "002-mary-and-angel-take2.mp3",
    femaleFile: "002-mary-and-angel-take2.mp3",
    active: true,
    index: 2,
  },
  {
    id: "003-birth-of-john-take1",
    storyNumber: 3,
    title: "Birth of John",
    take: 1,
    maleFile: "003-birth-of-john-take1.mp3",
    femaleFile: "003-birth-of-john-take1.mp3",
    active: false,
  },
  {
    id: "003-birth-of-john-take2",
    storyNumber: 3,
    title: "Birth of John",
    take: 2,
    maleFile: "003-birth-of-john-take2.mp3",
    femaleFile: "003-birth-of-john-take2.mp3",
    active: true,
    index: 3,
  },
  {
    id: "004-joseph-dream-part1",
    storyNumber: 4,
    title: "Joseph's Dream and Jesus' Birth (Part 1)",
    take: 1,
    maleFile: "004-joseph-dream-part1.mp3",
    femaleFile: "004-joseph-dream-part1.mp3",
    active: true,
    index: 4,
  },
  {
    id: "004-joseph-dream-part2-trial-end",
    storyNumber: 4,
    title: "Joseph's Dream and Jesus' Birth (Part 2)",
    take: 2,
    maleFile: "004-joseph-dream-part2-trial-end.mp3",
    femaleFile: "004-joseph-dream-part2-trial-end.mp3",
    active: true,
    index: 5,
    isFreeTrialEnd: true,
  },
  {
    id: "004-joseph-dream-part3-charge-start",
    storyNumber: 4,
    title: "Joseph's Dream and Jesus' Birth (Part 3)",
    take: 3,
    maleFile: "004-joseph-dream-part3-charge-start.mp3",
    femaleFile: "004-joseph-dream-part3-charge-start.mp3",
    active: true,
    index: 6,
    isChargeStart: true,
  },
  {
    id: "005-angel-announcement-take1",
    storyNumber: 5,
    title: "Angel Announcement of Jesus' Birth",
    take: 1,
    maleFile: "005-angel-announcement-take1.mp3",
    femaleFile: "005-angel-announcement-take1.mp3",
    active: false,
  },
  {
    id: "005-angel-announcement-take2",
    storyNumber: 5,
    title: "Angel Announcement of Jesus' Birth",
    take: 2,
    maleFile: "005-angel-announcement-take2.mp3",
    femaleFile: "005-angel-announcement-take2.mp3",
    active: true,
    index: 7,
  },
];
