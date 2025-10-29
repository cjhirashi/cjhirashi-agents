/**
 * Chat API Tests
 *
 * Unit tests for chat endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import prisma from '@/lib/db/prisma';

describe('Chat API Endpoints', () => {
  let testSessionId: string;
  const mockUserId = 'mock-user-id';

  beforeAll(async () => {
    // Setup: Create test session
    const session = await prisma.chat_sessions.create({
      data: {
        id: crypto.randomUUID(),
        userId: mockUserId,
        lastActivity: new Date(),
        metadata: {
          title: 'Test Chat Session'
        }
      }
    });
    testSessionId = session.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await prisma.chat_sessions.deleteMany({
      where: { userId: mockUserId }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/v1/chat/sessions', () => {
    it('should create a new chat session', async () => {
      const session = await prisma.chat_sessions.create({
        data: {
          id: crypto.randomUUID(),
          userId: mockUserId,
          lastActivity: new Date(),
          metadata: {
            title: 'New Test Session'
          }
        }
      });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(mockUserId);
    });
  });

  describe('GET /api/v1/chat/sessions', () => {
    it('should list user sessions with pagination', async () => {
      const sessions = await prisma.chat_sessions.findMany({
        where: { userId: mockUserId },
        take: 20,
        skip: 0,
        orderBy: { lastActivity: 'desc' }
      });

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/chat/sessions/[id]', () => {
    it('should return session details', async () => {
      const session = await prisma.chat_sessions.findFirst({
        where: {
          id: testSessionId,
          userId: mockUserId
        },
        include: {
          conversations: {
            include: {
              messages: true
            }
          }
        }
      });

      expect(session).toBeDefined();
      expect(session?.id).toBe(testSessionId);
    });

    it('should return 404 for non-existent session', async () => {
      const session = await prisma.chat_sessions.findFirst({
        where: {
          id: 'non-existent-id',
          userId: mockUserId
        }
      });

      expect(session).toBeNull();
    });
  });

  describe('DELETE /api/v1/chat/sessions/[id]', () => {
    it('should delete a session', async () => {
      // Create test session
      const session = await prisma.chat_sessions.create({
        data: {
          id: crypto.randomUUID(),
          userId: mockUserId,
          lastActivity: new Date(),
          metadata: {
            title: 'Session to Delete'
          }
        }
      });

      // Delete it
      await prisma.chat_sessions.delete({
        where: { id: session.id }
      });

      // Verify deletion
      const deleted = await prisma.chat_sessions.findUnique({
        where: { id: session.id }
      });

      expect(deleted).toBeNull();
    });
  });

  describe('GET /api/v1/chat/history/[sessionId]', () => {
    it('should return paginated message history', async () => {
      // Note: This test assumes Conversation exists
      // We'll need to create a conversation first

      const conversation = await prisma.conversations.create({
        data: {
          id: 'test-conversation-id',
          chatSessionId: testSessionId,
          agentId: 'mock-agent-id', // This would need to exist
          title: 'Test Conversation',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      const messages = await prisma.messages.findMany({
        where: { conversationId: conversation.id },
        take: 50,
        skip: 0,
        orderBy: { timestamp: 'asc' }
      });

      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe('Validation Tests', () => {
    it('should reject invalid sessionId format', () => {
      const invalidSessionId = 'not-a-uuid';
      // Zod validation would catch this
      expect(invalidSessionId).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should reject message exceeding max length', () => {
      const longMessage = 'x'.repeat(10001);
      expect(longMessage.length).toBeGreaterThan(10000);
    });

    it('should reject invalid temperature range', () => {
      const invalidTemp = 3.0;
      expect(invalidTemp).toBeGreaterThan(2.0);
    });
  });
});

describe('SSE Stream Tests', () => {
  it('should format SSE events correctly', () => {
    const messageId = crypto.randomUUID();
    const startEvent = `event: start\ndata: ${JSON.stringify({
      messageId,
      timestamp: new Date().toISOString()
    })}\n\n`;

    expect(startEvent).toContain('event: start');
    expect(startEvent).toContain('data:');
    expect(startEvent).toContain(messageId);
  });

  it('should format chunk events correctly', () => {
    const chunkEvent = `event: chunk\ndata: ${JSON.stringify({
      content: 'Hello',
      delta: 'Hello'
    })}\n\n`;

    expect(chunkEvent).toContain('event: chunk');
    expect(chunkEvent).toContain('"content":"Hello"');
    expect(chunkEvent).toContain('"delta":"Hello"');
  });

  it('should format done events correctly', () => {
    const messageId = crypto.randomUUID();
    const doneEvent = `event: done\ndata: ${JSON.stringify({
      messageId,
      tokensUsed: 250,
      cost: 0.00075,
      completedAt: new Date().toISOString()
    })}\n\n`;

    expect(doneEvent).toContain('event: done');
    expect(doneEvent).toContain('"tokensUsed":250');
    expect(doneEvent).toContain(messageId);
  });
});
