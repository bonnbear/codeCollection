import PQueue from 'p-queue'

// Queue configuration - managed by topic
const requestQueues: { [topicId: string]: PQueue } = {}

/**
 * Get or create a queue for a specific topic
 * @param topicId The ID of the topic
 * @param options
 * @returns A PQueue instance for the topic
 */
export const getTopicQueue = (topicId: string, options = {}): PQueue => {
  if (!requestQueues[topicId]) requestQueues[topicId] = new PQueue(options)
  return requestQueues[topicId]
}
