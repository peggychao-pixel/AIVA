import * as zod from "zod";

export const HealthStatus = zod.object({
  status: zod.string(),
});

export const HealthCheckResponse = HealthStatus;

export const Session = zod.object({
  id: zod.number(),
  ruminationThought: zod.string(),
  aiResponse: zod.string().optional(),
  timerCompleted: zod.boolean(),
  createdAt: zod.string(),
});

export const CreateSessionBody = zod.object({
  ruminationThought: zod.string().min(1),
  aiResponse: zod.string().optional(),
});

export const UpdateSessionParams = zod.object({
  id: zod.coerce.number(),
});

export const UpdateSessionBody = zod.object({
  timerCompleted: zod.boolean().optional(),
  aiResponse: zod.string().optional(),
});

export const UpdateSessionResponse = Session;
export const ListSessionsResponse = zod.array(Session);

export const GetAiResponseBody = zod.object({
  thought: zod.string().min(1),
});

export const GetAiResponseResponse = zod.object({
  message: zod.string(),
});

export const CreateOpenaiConversationBody = zod.object({
  title: zod.string().min(1),
});

export const OpenaiMessage = zod.object({
  id: zod.number(),
  conversationId: zod.number(),
  role: zod.string(),
  content: zod.string(),
  createdAt: zod.string(),
});

export const OpenaiConversation = zod.object({
  id: zod.number(),
  title: zod.string(),
  createdAt: zod.string(),
});

export const OpenaiConversationWithMessages = zod.object({
  id: zod.number(),
  title: zod.string(),
  createdAt: zod.string(),
  messages: zod.array(OpenaiMessage),
});

export const ListOpenaiConversationsResponse = zod.array(OpenaiConversation);

export const SendOpenaiMessageBody = zod.object({
  content: zod.string(),
});

export const UntangleChatHistoryItem = zod.object({
  role: zod.string(),
  content: zod.string(),
});

export const UntangleChatBody = zod.object({
  message: zod.string().min(1),
  mode: zod.enum(["before", "after", "loop", "pressure", "other"]),
  history: zod.array(UntangleChatHistoryItem).optional(),
  language: zod.enum(["auto", "tc", "en"]).optional(),
});

export const UntangleChatResponse = zod.object({
  response: zod.string(),
  isInsight: zod.boolean(),
  notNow: zod.boolean().optional(),
  lightRevisit: zod.boolean().optional(),
  deeperLayer: zod.object({
    surface: zod.string(),
    deeper: zod.string(),
    landing: zod.string(),
  }).optional().nullable(),
  suggestions: zod.array(zod.string()),
  loopType: zod.string().optional().nullable(),
  loopIntensity: zod.number().min(1).max(5).optional().nullable(),
  coreNeed: zod.string().optional().nullable(),
  sessionTrigger: zod.string().optional().nullable(),
  anchorPhrase: zod.string().optional().nullable(),
});

export const UntangleTranscribeBody = zod.object({
  audio: zod.string().min(1),
  mimeType: zod.string().min(1),
});

export const UntangleTranscribeResponse = zod.object({
  text: zod.string(),
});

export const MomentItem = zod.object({
  id: zod.number(),
  content: zod.string(),
  loopType: zod.string().optional().nullable(),
  anchorPhrase: zod.string().optional().nullable(),
  surfaceBelief: zod.string().optional().nullable(),
  hiddenFear: zod.string().optional().nullable(),
  coreNeed: zod.string().optional().nullable(),
  originalThought: zod.string().optional().nullable(),
  createdAt: zod.date(),
});

export const ListMomentsResponse = zod.array(MomentItem);

export const SaveMomentBody = zod.object({
  content: zod.string().min(1),
  loopType: zod.string().optional(),
  anchorPhrase: zod.string().optional(),
  surfaceBelief: zod.string().optional(),
  hiddenFear: zod.string().optional(),
  coreNeed: zod.string().optional(),
  originalThought: zod.string().optional(),
});

export const QuickUntangleBody = zod.object({
  thought: zod.string().min(1),
});

export const QuickUntangleResponse = zod.object({
  loopType: zod.string(),
  loopIntensity: zod.number().min(1).max(5),
  insight: zod.string(),
  anchorPhrase: zod.string(),
  suggestion: zod.string(),
});
