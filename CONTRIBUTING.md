# Contributing

This document describes how we work as a company — our processes, conventions,
and norms that apply across all repositories in the organization.

---

## Discussions

We use GitHub Discussions to communicate, share knowledge, and make decisions.
There are two scopes:

- **Repo-level discussions** — for topics that impact a specific project or
  product. Open these in the relevant repository.
- **Org-level discussions** — for topics that span the whole organization.
  Open these in the [organization Discussions][org-discussions].

### Categories

| Category       | Purpose                                                    | Where to use      |
| -------------- | ---------------------------------------------------------- | ----------------- |
| Announcements  | Share updates that others should be aware of               | Org or repo       |
| Decisions      | Discuss options and document a decision once reached       | Org or repo       |
| Ideas          | Propose new features or directions before they become work | Org or repo       |
| Polls          | Take a vote from the team on a question                    | Org or repo       |
| Q&A            | Ask the team for help or clarification                     | Org or repo       |
| Show and Tell  | Show off something you've built or learned                 | Org or repo       |

### Guidelines

- **Choose the right scope.** If a topic affects only one project, keep it in
  that repo. If it affects multiple teams or the whole company, use the org.
- **Decisions should be documented.** Use the _Decisions_ category to capture
  not just the outcome, but the context and alternatives considered. Mark the
  answer as the accepted answer once the decision is final.
- **Announcements are one-way.** Don't use them for open-ended discussion — use
  _Ideas_ or _Q&A_ instead if you want feedback.

[org-discussions]: https://github.com/orgs/0k-software/discussions

---

## Projects

We use organization-owned GitHub Projects, typically with one set of projects
per repo or product. All project names follow the convention:

> **emoji [Product name] Project name** — e.g. `🗺️ [Kingdone] Roadmap`

Each repo or product should have at minimum two standard projects: the
**Roadmap** and **Triage** projects.

### Roadmap

The Roadmap project holds all pitches and is the central planning board for the
product. It drives what gets built and when.

[→ Roadmap project][roadmap-project]

#### Statuses

| Status       | Meaning                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `Backlog`    | Pitch has been captured but not yet shaped                              |
| `Shaping`    | The pitch is being refined — problem, appetite, and solution are being defined |
| `Betting`    | The pitch is ready and being considered for the next cycle              |
| `Building`   | The pitch has been bet on and is actively being built                   |
| `Validating` | The work is done and is being validated before closing                  |
| `Done`       | The pitch is complete                                                   |

#### Process

1. New pitches are created using the **Pitch** issue template and land in
   `Backlog`.
2. During shaping, the pitch moves to `Shaping`. The team refines the problem,
   defines the appetite, and proposes a solution.
3. Once shaped, the pitch moves to `Betting` and is considered for the next
   cycle.
4. When a pitch is selected and work begins, it moves to `Building`. At this
   point:
   - A new project is created for the pitch using the
     [[TEMPLATE] 🏗️ Project][project-template] as a template.
   - A **Kickoff** issue is created (using the Kickoff template) as the first
     sub-issue of the pitch.
   - The pitch issue itself is added to the new project — this ensures all
     new sub-issues are automatically included in it.
   - All issues for this pitch are tracked as sub-issues of the pitch issue.
5. When building is complete, the pitch moves to `Validating`.
6. Once validated, it moves to `Done`.

#### Project template statuses

New pitch projects are created from the [[TEMPLATE] 🏗️ Project][project-template]
and use these statuses:

| Status            | Meaning                                        |
| ----------------- | ---------------------------------------------- |
| `Backlog`         | Issue captured, not yet refined                |
| `Refining`        | Being broken down or clarified                 |
| `Ready`           | Ready to be picked up                          |
| `In progress`     | Actively being worked on                       |
| `In review`       | Under code review or QA                        |
| `Ready to deploy` | Approved and waiting for deployment            |
| `Done`            | Deployed and complete                          |

### Triage

The Triage project collects all repo issues that are not pitches and don't yet
belong to a project — bugs, ad-hoc tasks, and small enhancements land here
automatically.

[→ Triage project][triage-project]

#### Statuses

| Status            | Meaning                                        |
| ----------------- | ---------------------------------------------- |
| `Backlog`         | Captured, not yet triaged                      |
| `Ready`           | Triaged and ready to be worked on              |
| `In progress`     | Actively being worked on                       |
| `In review`       | Under code review or QA                        |
| `Ready to deploy` | Approved and waiting for deployment            |
| `Done`            | Deployed and complete                          |

#### Process

During triage, the team reviews backlog items and decides:

- **Act now** — the issue is urgent; move it to `Ready` and handle it in the
  current cycle through the triage project.
- **Group and pitch** — the issue is not urgent; group it with related issues
  and create a new pitch in the Roadmap. The triage issues can be linked as
  sub-issues of the new pitch right away, and should be removed from Triage
  once linked.

[roadmap-project]: https://github.com/orgs/0k-software/projects/9
[triage-project]: https://github.com/orgs/0k-software/projects/11
[project-template]: https://github.com/orgs/0k-software/projects/6
