/* eslint-env jest */

import { Users, Channels, Brands, Tags, Integrations, Conversations } from '../db/models';
import { graphqlRequest, connect, disconnect } from '../db/connection';
import {
  userFactory,
  integrationFactory,
  conversationFactory,
  conversationMessageFactory,
  channelFactory,
  tagsFactory,
  brandFactory,
} from '../db/factories';

beforeAll(() => connect());

afterAll(() => disconnect());

describe('conversationQueries', () => {
  let user;
  let channel;
  let brand;
  let integration;

  const commonParamDefs = `
    $limit: Int,
    $channelId: String
    $status: String
    $unassigned: String
    $brandId: String
    $tag: String
    $integrationType: String
    $participating: String
    $starred: String
    $ids: [String]
  `;

  const commonParams = `
    limit: $limit
    channelId: $channelId
    status: $status
    unassigned: $unassigned
    brandId: $brandId
    tag: $tag
    integrationType: $integrationType
    participating: $participating
    starred: $starred
    ids: $ids
  `;

  const qryConversations = `
    query conversations(${commonParamDefs}) {
      conversations(${commonParams}) {
        _id
        content
        integrationId
        customerId
        userId
        assignedUserId
        participatedUserIds
        readUserIds
        createdAt
        updatedAt
        status
        messageCount
        number
        tagIds
        twitterData
        facebookData

        messages {
          _id
          content
          attachments
          mentionedUserIds
          conversationId
          internal
          customerId
          userId
          createdAt
          isCustomerRead
          engageData {
            messageId
            brandId
            content
            fromUserId
            kind
            sentAs
          }
          formWidgetData
          twitterData
          user { _id }
          customer { _id }
        }
        tags { _id }
        customer { _id }
        integration { _id }
        user { _id }
        assignedUser { _id }
        participatedUsers { _id }
        participatorCount
      }
    }
  `;

  const qryCount = `
    query conversationCounts(${commonParamDefs}) {
      conversationCounts(${commonParams})
    }
  `;

  const qryTotalCount = `
    query conversationsTotalCount(${commonParamDefs}) {
      conversationsTotalCount(${commonParams})
    }
  `;

  const qryConversationDetail = `
    query conversationDetail($_id: String!) {
      conversationDetail(_id: $_id) {
        _id
      }
    }
  `;

  const qryGetLast = `
    query conversationsGetLast(${commonParamDefs}) {
      conversationsGetLast(${commonParams}) {
        _id
      }
    }
  `;

  const qryTotalUnread = `
    query conversationsTotalUnreadCount {
      conversationsTotalUnreadCount
    }
  `;

  beforeEach(async () => {
    brand = await brandFactory();
    user = await userFactory({});

    integration = await integrationFactory({
      kind: 'messenger',
      brandId: brand._id,
    });

    channel = await channelFactory({
      memberIds: [user._id],
      integrationIds: [integration._id],
    });
  });

  afterEach(async () => {
    // Clearing test data
    await Conversations.remove({});
    await Users.remove({});
    await Brands.remove({});
    await Channels.remove({});
    await Tags.remove({});
    await Integrations.remove({});
  });

  test('Conversation messages with skip', async () => {
    const conversation = await conversationFactory();

    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });
    await conversationMessageFactory({ conversationId: conversation._id });

    const qry = `
      query conversationMessages($_id: String! $skip: Int) {
        conversationMessages(_id: $_id skip: $skip) {
          list {
            _id
          }
          totalCount
        }
      }
    `;

    const responses = await graphqlRequest(qry, 'conversationMessages', {
      _id: conversation._id,
      skip: 3,
    });

    expect(responses.list.length).toBe(10);
    expect(responses.totalCount).toBe(14);
  });

  test('Conversations filtered by ids', async () => {
    const conversation1 = await conversationFactory();
    const conversation2 = await conversationFactory();
    const conversation3 = await conversationFactory();

    await conversationFactory();
    await conversationFactory();

    const ids = [conversation1._id, conversation2._id, conversation3._id];

    const responses = await graphqlRequest(qryConversations, 'conversations', { ids });

    expect(responses.length).toBe(3);
  });

  test('Conversations filtered by channel', async () => {
    await conversationFactory({ integrationId: integration._id });
    await conversationFactory();
    await conversationFactory();

    const responses = await graphqlRequest(qryConversations, 'conversations', {
      channelId: channel._id,
    });

    expect(responses.length).toBe(1);
  });

  test('Conversations filtered by brand', async () => {
    await conversationFactory({ integrationId: integration._id });
    await conversationFactory();
    await conversationFactory();

    const responses = await graphqlRequest(qryConversations, 'conversations', {
      brandId: brand._id,
    });

    expect(responses.length).toBe(1);
  });

  test('Conversations filtered by participating user', async () => {
    await conversationFactory({
      integrationId: integration._id,
      participatedUserIds: [user._id],
    });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    const responses = await graphqlRequest(
      qryConversations,
      'conversations',
      { participating: 'true' },
      { user },
    );

    expect(responses.length).toBe(1);
  });

  test('Conversations filtered by status', async () => {
    await conversationFactory({
      status: 'closed',
      integrationId: integration._id,
    });

    await conversationFactory({
      status: 'new',
      integrationId: integration._id,
    });

    await conversationFactory({
      status: 'new',
      integrationId: integration._id,
    });

    const responses = await graphqlRequest(
      qryConversations,
      'conversations',
      { status: 'closed' },
      { user },
    );

    expect(responses.length).toBe(1);
  });

  test('Conversations filtered by unassigned', async () => {
    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
    });

    const responses = await graphqlRequest(
      qryConversations,
      'conversations',
      { unassigned: 'true' },
      { user },
    );

    expect(responses.length).toBe(1);
  });

  test('Conversations filtered by starred', async () => {
    const conversation = await conversationFactory({
      integrationId: integration._id,
    });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    await Users.update({ _id: user._id }, { $set: { starredConversationIds: [conversation._id] } });

    const updatedUser = await Users.findOne({ _id: user._id });

    const responses = await graphqlRequest(
      qryConversations,
      'conversations',
      { starred: 'true' },
      { user: updatedUser },
    );

    expect(responses.length).toBe(1);
  });

  test('Conversations filtered by integration type', async () => {
    const integration1 = await integrationFactory({ kind: 'form' });
    const integration2 = await integrationFactory({ kind: 'form' });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration1._id });
    await conversationFactory({ integrationId: integration2._id });

    const responses = await graphqlRequest(
      qryConversations,
      'conversations',
      { integrationType: 'messenger' },
      { user },
    );

    expect(responses.length).toBe(1);
  });

  test('Conversations filtered by tag', async () => {
    const tag = await tagsFactory({ type: 'conversation' });

    await conversationFactory({ tagIds: [tag._id], integrationId: integration._id });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    const responses = await graphqlRequest(
      qryConversations,
      'conversations',
      { tag: tag._id },
      { user },
    );

    expect(responses.length).toBe(1);
  });

  test('Count conversations by channel', async () => {
    const integration1 = await integrationFactory({});

    // conversation with channel
    await conversationFactory({ integrationId: integration._id });

    await conversationFactory({ integrationId: integration1._id });
    await conversationFactory({ integrationId: integration1._id });

    const response = await graphqlRequest(qryCount, 'conversationCounts', {
      channelId: channel._id,
    });

    expect(response.byChannels[channel._id]).toBe(1);
  });

  test('Count conversations by brand', async () => {
    const integration1 = await integrationFactory({});

    // conversation with brand
    await conversationFactory({ integrationId: integration._id });

    await conversationFactory({ integrationId: integration1._id });
    await conversationFactory({ integrationId: integration1._id });

    const response = await graphqlRequest(qryCount, 'conversationCounts', { brandId: brand._id });

    expect(response.byBrands[brand._id]).toBe(1);
  });

  test('Count conversations by unassigned', async () => {
    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
    });

    const response = await graphqlRequest(
      qryCount,
      'conversationCounts',
      { unassigned: 'true' },
      { user },
    );

    expect(response.unassigned).toBe(1);
  });

  test('Count conversations by participating', async () => {
    await conversationFactory({
      integrationId: integration._id,
      participatedUserIds: [user._id],
    });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    const response = await graphqlRequest(
      qryCount,
      'conversationCounts',
      { participating: 'true' },
      { user },
    );

    expect(response.participating).toBe(1);
  });

  test('Count conversations by starred', async () => {
    const conversation = await conversationFactory({ integrationId: integration._id });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    await Users.update({ _id: user._id }, { $set: { starredConversationIds: [conversation._id] } });

    const updatedUser = await Users.findOne({ _id: user._id });

    const response = await graphqlRequest(
      qryCount,
      'conversationCounts',
      { starred: 'true' },
      { user: updatedUser },
    );

    expect(response.starred).toBe(1);
  });

  test('Count conversations by resolved', async () => {
    await conversationFactory({
      integrationId: integration._id,
      status: 'closed',
    });

    await conversationFactory({
      integrationId: integration._id,
      status: 'new',
    });

    await conversationFactory({
      integrationId: integration._id,
      status: 'new',
    });

    const response = await graphqlRequest(
      qryCount,
      'conversationCounts',
      { status: 'closed' },
      { user },
    );

    expect(response.resolved).toBe(1);
  });

  test('Count conversations by integration type', async () => {
    const integration1 = await integrationFactory({ kind: 'form' });
    const integration2 = await integrationFactory({ kind: 'form' });

    // conversation with integration type 'messenger'
    await conversationFactory({ integrationId: integration._id });

    await conversationFactory({ integrationId: integration1._id });
    await conversationFactory({ integrationId: integration2._id });

    let response = await graphqlRequest(
      qryCount,
      'conversationCounts',
      { integrationType: 'messenger' },
      { user },
    );

    response = response.byIntegrationTypes.messenger;

    expect(response).toBe(1);
  });

  test('Count conversations by tag', async () => {
    const tag = await tagsFactory({ type: 'conversation' });

    await conversationFactory({
      tagIds: [tag._id],
      integrationId: integration._id,
    });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    const response = await graphqlRequest(
      qryCount,
      'conversationCounts',
      { tag: tag._id },
      { user },
    );

    expect(response.byTags[tag._id]).toBe(1);
  });

  test('Get total count of conversations by channel', async () => {
    const integration1 = await integrationFactory({});
    const integration2 = await integrationFactory({});

    // integration with channel
    await conversationFactory({ integrationId: integration._id });

    await conversationFactory({ integrationId: integration1._id });
    await conversationFactory({ integrationId: integration2._id });

    const response = await graphqlRequest(qryTotalCount, 'conversationsTotalCount', {
      channelId: channel._id,
    });

    expect(response).toBe(1);
  });

  test('Get total count of conversations by brand', async () => {
    const integration1 = await integrationFactory({});
    const integration2 = await integrationFactory({});

    // integration with brand
    await conversationFactory({ integrationId: integration._id });

    await conversationFactory({ integrationId: integration1._id });
    await conversationFactory({ integrationId: integration2._id });

    const response = await graphqlRequest(qryTotalCount, 'conversationsTotalCount', {
      brandId: brand._id,
    });

    expect(response).toBe(1);
  });

  test('Get total count of conversations by unassigned', async () => {
    await conversationFactory({
      integrationId: integration._id,
    });

    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    await conversationFactory({
      integrationId: integration._id,
      assignedUserId: user._id,
    });

    const response = await graphqlRequest(
      qryTotalCount,
      'conversationsTotalCount',
      { unassigned: 'true' },
      { user },
    );

    expect(response).toBe(1);
  });

  test('Get total count of conversations by participating', async () => {
    await conversationFactory({
      integrationId: integration._id,
      participatedUserIds: [user._id],
    });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    const response = await graphqlRequest(
      qryTotalCount,
      'conversationsTotalCount',
      { participating: 'true' },
      { user },
    );

    expect(response).toBe(1);
  });

  test('Get total count of conversations by starred', async () => {
    const conversation = await conversationFactory({
      integrationId: integration._id,
    });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    await Users.update({ _id: user._id }, { $set: { starredConversationIds: [conversation._id] } });

    const updatedUser = await Users.findOne({ _id: user._id });

    const response = await graphqlRequest(
      qryTotalCount,
      'conversationsTotalCount',
      { starred: 'true' },
      { user: updatedUser },
    );

    expect(response).toBe(1);
  });

  test('Get total count of conversations by status', async () => {
    await conversationFactory({
      integrationId: integration._id,
      status: 'closed',
    });

    await conversationFactory({
      integrationId: integration._id,
      status: 'new',
    });

    await conversationFactory({
      integrationId: integration._id,
      status: 'new',
    });

    const response = await graphqlRequest(
      qryTotalCount,
      'conversationsTotalCount',
      { status: 'closed' },
      { user },
    );

    expect(response).toBe(1);
  });

  test('Get total count of conversations by integration type', async () => {
    const integration1 = await integrationFactory({ kind: 'form' });
    const integration2 = await integrationFactory({ kind: 'form' });

    // integration with type messenger
    await conversationFactory({ integrationId: integration._id });

    await conversationFactory({ integrationId: integration1._id });
    await conversationFactory({ integrationId: integration2._id });

    const response = await graphqlRequest(
      qryTotalCount,
      'conversationsTotalCount',
      { integrationType: 'messenger' },
      { user },
    );

    expect(response).toBe(1);
  });

  test('Get total count of conversations by tag', async () => {
    const tag = await tagsFactory({ type: 'conversation' });

    await conversationFactory({
      tagIds: [tag._id],
      integrationId: integration._id,
    });

    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });

    const response = await graphqlRequest(
      qryTotalCount,
      'conversationsTotalCount',
      { tag: tag._id },
      { user },
    );

    expect(response).toBe(1);
  });

  test('Conversation detail', async () => {
    await conversationFactory({ integrationId: integration._id });

    const conversation = await conversationFactory({
      integrationId: integration._id,
    });

    const response = await graphqlRequest(
      qryConversationDetail,
      'conversationDetail',
      { _id: conversation._id },
      { user },
    );

    expect(response._id).toBe(conversation._id);
  });

  test('Get last conversation by channel', async () => {
    await conversationFactory({ integrationId: integration._id });
    await conversationFactory({ integrationId: integration._id });
    const conversation = await conversationFactory({ integrationId: integration._id });

    const response = await graphqlRequest(qryGetLast, 'conversationsGetLast', {}, { user });

    expect(response._id).toBe(conversation._id);
  });

  test('Get all unread conversations', async () => {
    await conversationFactory({
      integrationId: integration._id,
      status: 'new',
      readUserIds: [user._id],
    });

    await conversationFactory({
      integrationId: integration._id,
      status: 'new',
      readUserIds: [],
    });

    const response = await graphqlRequest(
      qryTotalUnread,
      'conversationsTotalUnreadCount',
      {},
      { user },
    );

    expect(response).toBe(1);
  });
});
