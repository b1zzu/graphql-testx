import "cross-fetch/polyfill";
import "fake-indexeddb/auto";

import { print } from "graphql";
import { request } from "graphql-request";
import gql from "graphql-tag";
import {
  ApolloOfflineClient,
  CacheOperation,
  createClient,
  createSubscriptionOptions
} from "offix-client";
import { TestxServer } from "../../../src";
import { ToggleableNetworkStatus } from "../utils/network";

// TODO: remove this queries once we expose client queries/mutations
// TODO: from the TestxServer API
// TODO: https://github.com/aerogear/graphql-testx/issues/15
const FIND_ALL_TASKS = gql`
  query findAllTasks {
    findAllTasks {
      id
      title
    }
  }
`;

const ADD_TASK = gql`
  mutation createTask($title: String!) {
    createTask(input: { title: $title }) {
      id
      title
    }
  }
`;

const NEW_TASK = gql`
  subscription newTask {
    newTask {
      id
      title
    }
  }
`;

describe("Subscription", () => {
  let server: TestxServer;
  let offix: ApolloOfflineClient;

  beforeAll(async () => {
    server = new TestxServer(`
      type Task {
        id: ID!
        title: String!
      }`);
    await server.start();
    // tslint:disable-next-line: no-console
    console.log(`Running on ${server.url()}`);

    offix = await createClient({
      networkStatus: new ToggleableNetworkStatus(),
      httpUrl: server.url(),
      // @ts-ignore
      wsUrl: server.ws()
    });
  }, 10 * 1000);

  afterAll(() => {
    server.close();
  });

  it("Update object while offline", async () => {
    let result;

    // initialize cache
    result = await offix.query({ query: FIND_ALL_TASKS });
    expect(result.data.findAllTasks).toHaveLength(0);

    // initialize the subscription listener
    const options = createSubscriptionOptions({
      subscriptionQuery: NEW_TASK,
      cacheUpdateQuery: FIND_ALL_TASKS,
      operationType: CacheOperation.ADD
    });
    offix.watchQuery({ query: FIND_ALL_TASKS }).subscribeToMore(options);

    // sleep
    await new Promise(r => setTimeout(r, 300));

    // create a task using a different client in order
    // to simulate a different user
    await request(server.url(), print(ADD_TASK), { title: "hello" });

    // sleep
    await new Promise(r => setTimeout(r, 300));

    // create the task while online
    result = await offix.query({
      query: FIND_ALL_TASKS,
      fetchPolicy: "cache-only"
    });
    const tasks = result.data.findAllTasks;

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual("hello");
  });
});
