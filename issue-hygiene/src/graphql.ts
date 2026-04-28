export type OrgProject = {
  id: string;
  title: string;
};

export type RepoIssue = {
  id: string;
  number: number;
  issueType: { name: string } | null;
  projectItems: {
    nodes: Array<{
      id: string;
      project: { id: string; title: string };
    }>;
  };
  labels: { nodes: Array<{ name: string }> };
  comments: {
    nodes: Array<{ id: string; body: string; minimizedReason: string | null }>;
  };
};

export type GraphqlClient = {
  graphql: <T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
  ) => Promise<T>;
};

// Retries on 429, secondary-rate-limit (403 + Retry-After), and 5xx.
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number }).status;
      const isRetryable =
        status === 429 ||
        (status === 403 &&
          (err as { response?: { headers?: Record<string, string> } }).response
            ?.headers?.["retry-after"] != null) ||
        (status != null && status >= 500);
      if (!isRetryable || attempt === maxAttempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

const TRIAGE_TITLE_RE = /^[^\s]+ \[(?<repo>[^\]]+)\] Triage$/;

export async function queryOrgProjects(
  client: GraphqlClient,
  org: string,
): Promise<{ projectsByRepo: Map<string, OrgProject[]>; allProjects: OrgProject[] }> {
  const data = await withRetry(() =>
    client.graphql<{
      organization: {
        projectsV2: { nodes: Array<{ id: string; title: string }> };
      };
    }>(
      `query($org: String!) {
        organization(login: $org) {
          projectsV2(first: 100) {
            nodes { id title }
          }
        }
      }`,
      { org },
    ),
  );

  const allProjects: OrgProject[] = data.organization.projectsV2.nodes;
  const projectsByRepo = new Map<string, OrgProject[]>();

  for (const project of allProjects) {
    const match = TRIAGE_TITLE_RE.exec(project.title);
    if (match?.groups?.["repo"]) {
      const repo = match.groups["repo"];
      const list = projectsByRepo.get(repo) ?? [];
      list.push(project);
      projectsByRepo.set(repo, list);
    }
  }

  return { projectsByRepo, allProjects };
}

export type RepoLabel = { id: string; name: string };

export async function queryRepoLabels(
  client: GraphqlClient,
  owner: string,
  repo: string,
): Promise<Map<string, string>> {
  const data = await withRetry(() =>
    client.graphql<{
      repository: { labels: { nodes: Array<{ id: string; name: string }> } };
    }>(
      `query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          labels(first: 100) { nodes { id name } }
        }
      }`,
      { owner, repo },
    ),
  );
  const map = new Map<string, string>();
  for (const label of data.repository.labels.nodes) {
    map.set(label.name, label.id);
  }
  return map;
}

export async function queryRepoIssues(
  client: GraphqlClient,
  owner: string,
  repo: string,
): Promise<RepoIssue[]> {
  const issues: RepoIssue[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data = await withRetry(() =>
      client.graphql<{
        repository: {
          issues: {
            nodes: RepoIssue[];
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        };
      }>(
        `query($owner: String!, $repo: String!, $cursor: String) {
          repository(owner: $owner, name: $repo) {
            issues(first: 100, states: OPEN, after: $cursor) {
              nodes {
                id
                number
                issueType { name }
                projectItems(first: 20) {
                  nodes { id project { id title } }
                }
                labels(first: 20) { nodes { name } }
                comments(last: 100) { nodes { id body minimizedReason } }
              }
              pageInfo { hasNextPage endCursor }
            }
          }
        }`,
        { owner, repo, cursor },
      ),
    );

    issues.push(...data.repository.issues.nodes);
    hasNextPage = data.repository.issues.pageInfo.hasNextPage;
    cursor = data.repository.issues.pageInfo.endCursor;
  }

  return issues;
}
