export interface Activity {
  id: string;
  title: string;
  description: string;
  instructions: string[];
}

export const DOPAMINE_ACTIVITIES: Activity[] = [
  {
    id: "focus-sprint",
    title: "5-minute focus sprint",
    description: "Channel your energy into one tiny, productive task.",
    instructions: [
      "Pick one small task you've been putting off (e.g., replying to an email, tidying your desk).",
      "Set a separate timer for 5 minutes.",
      "Work on only that task until the timer goes off.",
      "When finished, take a deep breath and acknowledge your effort."
    ]
  },
  {
    id: "breathing-reset",
    title: "Quick breathing reset (4-7-8)",
    description: "Calm your nervous system and shift out of the looping state.",
    instructions: [
      "Exhale completely through your mouth, making a whoosh sound.",
      "Close your mouth and inhale quietly through your nose to a mental count of 4.",
      "Hold your breath for a count of 7.",
      "Exhale completely through your mouth, to a count of 8.",
      "Repeat this cycle 4 times."
    ]
  },
  {
    id: "math-challenge",
    title: "Mini math challenge",
    description: "Engage the logical part of your brain to break emotional loops.",
    instructions: [
      "Start with the number 100.",
      "Subtract 7 to get 93.",
      "Keep subtracting 7 sequentially (86, 79, 72...).",
      "If you lose your place, start over from 100.",
      "Continue until you reach 0 or feel your mind clear."
    ]
  },
  {
    id: "word-game",
    title: "Word association game",
    description: "A playful distraction to shift your thought patterns.",
    instructions: [
      "Look around the room and name one object you see (e.g., 'Lamp').",
      "Think of a word that starts with the last letter of that word (e.g., 'Piano').",
      "Continue chaining words together for 2 minutes.",
      "Try to pick increasingly complex or abstract words."
    ]
  },
  {
    id: "gratitude",
    title: "Gratitude moment",
    description: "Reframe your current mindset by focusing on appreciation.",
    instructions: [
      "Think of three specific things you are grateful for right now.",
      "They can be as small as 'a comfortable chair' or 'a good cup of coffee'.",
      "Visualize each one clearly in your mind for 15 seconds.",
      "Notice how your body feels as you focus on gratitude."
    ]
  },
  {
    id: "body-scan",
    title: "Body scan check-in",
    description: "Ground yourself back in your physical presence.",
    instructions: [
      "Sit comfortably and close your eyes.",
      "Bring your attention to your toes, simply noticing any sensations.",
      "Slowly move your focus upward through your legs, stomach, chest, arms, and head.",
      "If you notice tension, imagine sending a warm, relaxing breath to that area.",
      "Take one final deep breath when you reach the top of your head."
    ]
  }
];

export function getRandomActivities(count: number): Activity[] {
  const shuffled = [...DOPAMINE_ACTIVITIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
