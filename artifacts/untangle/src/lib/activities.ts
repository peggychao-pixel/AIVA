export interface Activity {
  id: string;
  tag: string;
  title: string;
  description: string;
  steps: string[];
}

export const REDIRECT_ACTIVITIES: Activity[] = [
  {
    id: "serial-subtract",
    tag: "MATH",
    title: "Serial 7 Subtraction",
    description: "Count backward from 300 by 7s. Harder than it sounds. Your brain cannot ruminate and do arithmetic at the same time.",
    steps: [
      "Start at 300.",
      "Subtract 7. Say the result aloud or type it.",
      "Keep going — 293, 286, 279...",
      "Lose your place? Start over. That's the point."
    ]
  },
  {
    id: "focus-sprint",
    tag: "TASK",
    title: "3-Minute Focus Sprint",
    description: "Pick one thing you've been ignoring. Do only that for 3 minutes. Specificity required.",
    steps: [
      "Name one concrete task (not 'work on project' — something like 'reply to the email from Tuesday').",
      "Set a timer for 3 minutes.",
      "No tab switching. No checking. Just that one thing.",
      "Stop when the timer ends. Logged and closed."
    ]
  },
  {
    id: "reaction-test",
    tag: "GAME",
    title: "Reaction Test",
    description: "Test your reaction time. Uses the same neural pathways as the loop you're stuck in — but redirected.",
    steps: [
      "Click 'Launch Game' below.",
      "Tap each target before it disappears.",
      "Beat your previous score.",
      "Your loop cannot survive this."
    ]
  },
  {
    id: "word-chain",
    tag: "VERBAL",
    title: "Category Word Chain",
    description: "Pick a category. Name items until you hit 20. Running out before 20 means starting a harder category.",
    steps: [
      "Choose: Countries / Capital Cities / Nobel Prize Winners / Programming Languages / Philosophy Movements.",
      "Name one every 3 seconds.",
      "No repeats. Get to 20.",
      "If you stall, pick a harder category."
    ]
  },
  {
    id: "logic-puzzle",
    tag: "LOGIC",
    title: "Constraint Logic",
    description: "Solve a rapid logic constraint. The kind with no emotional content whatsoever.",
    steps: [
      "If 5 people each shake hands once with every other person, how many handshakes total?",
      "Work it out in your head. No calculator.",
      "Verify your answer. (It's 10.)",
      "Try next: same problem with 8 people. Then 12."
    ]
  },
  {
    id: "speed-list",
    tag: "SPEED",
    title: "Speed Categorization",
    description: "30-second rapid-fire naming. No pauses allowed.",
    steps: [
      "Pick: mammals, European capitals, US states, or programming languages.",
      "Name as many as you can in 30 seconds.",
      "Write them down if it helps.",
      "Your target: 15 items. Beat it."
    ]
  }
];

export function getRandomActivities(count: number): Activity[] {
  const shuffled = [...REDIRECT_ACTIVITIES].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
