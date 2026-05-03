/**
 * ============================================================================
 * GitHub 工具集入口
 * ============================================================================
 *
 * 聚合 GitHub 仓库查询、代码搜索、提交历史、Issue、PR、
 * 文件操作、分支、工作流等全部功能的导出. 
 *
 * @module src/theme/tools/github
 */

// repo.ts
export {
  githubCompareCommits, githubCreateRelease, githubCreateRepo, githubDeleteRepo, githubGetCommitHistory, githubGetFileContent, githubGetRateLimit, githubGetReadme, githubGetRepo,
  githubListRepoContents, githubSearchCode, githubSearchRepos, githubUpdateRepo
} from './repo'

// issue.ts
export {
  githubCreateIssue,
  githubCreateIssueComment, githubGetIssues, githubListIssueComments,
  githubSearchIssues, githubUpdateIssue
} from './issue'

// pull-request.ts
export {
  githubCreatePullRequest, githubCreatePullRequestReview, githubGetPull, githubGetPullRequestFiles, githubListPulls, githubMergePullRequest
} from './pull-request'

// file.ts
export {
  githubCreateOrUpdateFile,
  githubDeleteFile
} from './file'

// branch.ts
export {
  githubCreateBranch,
  githubDeleteBranch,
  githubForkRepo,
  githubListBranches
} from './branch'

// workflow.ts
export {
  githubListWorkflowRuns, githubListWorkflows, githubTriggerWorkflow
} from './workflow'

// repo.ts definitions
export {
  githubCompareCommitsDef, githubCreateReleaseDef, githubCreateRepoDef, githubDeleteRepoDef, githubGetCommitHistoryDef, githubGetFileContentDef, githubGetRateLimitDef, githubGetReadmeDef, githubGetRepoDef,
  githubListRepoContentsDef, githubSearchCodeDef, githubSearchReposDef, githubUpdateRepoDef
} from './repo'

// issue.ts definitions
export {
  githubCreateIssueCommentDef, githubCreateIssueDef, githubGetIssuesDef, githubListIssueCommentsDef,
  githubSearchIssuesDef, githubUpdateIssueDef
} from './issue'

// pull-request.ts definitions
export {
  githubCreatePullRequestDef, githubCreatePullRequestReviewDef, githubGetPullDef, githubGetPullRequestFilesDef, githubListPullsDef, githubMergePullRequestDef
} from './pull-request'

// file.ts definitions
export {
  githubCreateOrUpdateFileDef,
  githubDeleteFileDef
} from './file'

// branch.ts definitions
export {
  githubCreateBranchDef,
  githubDeleteBranchDef,
  githubForkRepoDef,
  githubListBranchesDef
} from './branch'

// workflow.ts definitions
export {
  githubListWorkflowRunsDef, githubListWorkflowsDef, githubTriggerWorkflowDef
} from './workflow'

