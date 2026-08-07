export type Voice = "male" | "female";

export interface StoryClip {
  /** Unique id for this specific audio clip (one story number can have several clips/takes). */
  id: string;
  /** Story number as grouped in the source recordings (000, 001, 002...). */
  storyNumber: number;
  /** Human readable title. */
  title: string;
  /** Take/part number within the story number. */
  take: number;
  /** File name inside public/audio/male/ or public/audio/female/. */
  maleFile: string;
  femaleFile: string;
  /**
   * Whether this clip is used in the live daily-delivery sequence.
   * Clips with active:false are alternate takes kept only for quality review
   * on the admin test page.
   */
  active: boolean;
  /** Position in the active delivery sequence (only set when active is true). */
  index?: number;
  /** This clip is the last free-trial delivery (day 10). */
  isFreeTrialEnd?: boolean;
  /** This clip is the first delivery after the trial ends and billing starts (day 11). */
  isChargeStart?: boolean;
}

// All 13 clips recorded so far, for both the David (male) and Sarah (female) voice.
// Filenames below map 1:1 by position to the original files in resources/David Voice
// and resources/Sarah Voice, copied into public/audio/{male,female}/.
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

/** All 13 clips for a voice, in original recording order — used by the admin QA/test page. */
export function getAllClipsForVoice(voice: Voice): { clip: StoryClip; url: string }[] {
  return STORY_CLIPS.map((clip) => ({
    clip,
    url: `/audio/${voice}/${voice === "male" ? clip.maleFile : clip.femaleFile}`,
  }));
}

/** The live daily-delivery sequence: only "active" clips, ordered by index. */
export function getActiveSequence(): StoryClip[] {
  return STORY_CLIPS.filter((c) => c.active).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
}

/** Get the clip to deliver next for a customer, given their current storyIndex and voice. */
export function getClipForDelivery(storyIndex: number, voice: Voice): { clip: StoryClip; url: string } | null {
  const sequence = getActiveSequence();
  const clip = sequence[storyIndex];
  if (!clip) return null;
  const file = voice === "male" ? clip.maleFile : clip.femaleFile;
  return { clip, url: `/audio/${voice}/${file}` };
}

export function absoluteAudioUrl(appUrl: string, relativeUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}${relativeUrl}`;
}
