/**
 * 学术研究工具定义
 * 供 AI 使用的工具 Schema 定义
 */

import type { ToolDefinition } from '../types'

// ==================== ArXiv 工具定义 ====================

export const searchArxivDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_arxiv',
    description: `搜索 ArXiv 学术论文库。ArXiv 是计算机科学、物理学、数学等领域的预印本论文库。

使用场景：
- 查找特定研究领域的最新论文
- 追踪学术研究进展
- 获取论文的摘要和基本信息

常用分类：
- cs.AI: 人工智能
- cs.CL: 计算语言学 (NLP)
- cs.CV: 计算机视觉
- cs.LG: 机器学习
- cs.RO: 机器人学`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，如 "transformer attention mechanism"'
        },
        category: {
          type: 'string',
          description: '论文分类，如 cs.AI、cs.CL、cs.CV',
          default: ''
        },
        max_results: {
          type: 'number',
          description: '返回结果数量（1-50）',
          default: 10
        },
        sort_by: {
          type: 'string',
          enum: ['relevance', 'lastUpdatedDate', 'submittedDate'],
          description: '排序方式',
          default: 'relevance'
        }
      },
      required: ['query']
    }
  }
}

export const fetchArxivDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_arxiv',
    description: '获取 ArXiv 论文的详细信息，包括完整摘要、作者、分类、PDF 链接等。',
    parameters: {
      type: 'object',
      properties: {
        paper_id: {
          type: 'string',
          description: 'ArXiv 论文 ID，如 "2401.12345"'
        }
      },
      required: ['paper_id']
    }
  }
}

// ==================== OpenReview 工具定义 ====================

export const searchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_openreview',
    description: `搜索 OpenReview 论文。OpenReview 是 ICLR、NeurIPS、ICML 等顶级会议的论文发布平台。

使用场景：
- 查找顶级会议（ICLR/NeurIPS/ICML）的论文
- 获取同行评议的论文
- 追踪最新会议论文`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        venue: {
          type: 'string',
          description: '会议/期刊，如 "ICLR", "NeurIPS", "ICML"',
          default: ''
        },
        limit: {
          type: 'number',
          description: '返回结果数量',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

export const fetchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_openreview',
    description: '获取 OpenReview 论文的详细信息。',
    parameters: {
      type: 'object',
      properties: {
        forum_id: {
          type: 'string',
          description: 'OpenReview 论坛 ID'
        }
      },
      required: ['forum_id']
    }
  }
}

// ==================== HuggingFace 工具定义 ====================

export const searchHuggingFaceDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_huggingface',
    description: `搜索 HuggingFace 模型库。HuggingFace 是最大的开源 AI 模型社区。

使用场景：
- 查找预训练模型
- 发现适合特定任务的模型
- 了解模型的下载量和受欢迎程度

常见任务类型：
- text-classification: 文本分类
- token-classification: 命名实体识别
- question-answering: 问答
- text-generation: 文本生成
- summarization: 摘要
- translation: 翻译
- image-classification: 图像分类
- object-detection: 目标检测`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词，如 "bert", "gpt", "llama"'
        },
        task: {
          type: 'string',
          description: '任务类型过滤，如 "text-classification"',
          default: ''
        },
        sort: {
          type: 'string',
          enum: ['downloads', 'likes', 'created'],
          description: '排序方式',
          default: 'downloads'
        },
        limit: {
          type: 'number',
          description: '返回结果数量',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

export const fetchHuggingFaceModelDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_huggingface_model',
    description: '获取 HuggingFace 模型的详细信息，包括模型配置、使用说明等。',
    parameters: {
      type: 'object',
      properties: {
        model_id: {
          type: 'string',
          description: '模型 ID，如 "bert-base-chinese"'
        }
      },
      required: ['model_id']
    }
  }
}

// ==================== Papers With Code 工具定义 ====================

export const searchPapersWithCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_paperswithcode',
    description: `搜索 Papers With Code。该平台链接学术论文与其开源代码实现。

使用场景：
- 查找带有开源代码的论文
- 获取论文的 GitHub 实现
- 查看论文在多个任务上的性能排行`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        limit: {
          type: 'number',
          description: '返回结果数量',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

// ==================== Semantic Scholar 工具定义 ====================

export const searchSemanticScholarDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_semantic_scholar',
    description: `搜索 Semantic Scholar 学术数据库。Semantic Scholar 提供全面的学术文献搜索和引用信息。

使用场景：
- 全面的学术文献搜索
- 查看论文引用次数
- 追踪论文的影响力`,
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        limit: {
          type: 'number',
          description: '返回结果数量（最大100）',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

// ==================== 导出所有定义 ====================

export const academicToolDefinitions = {
  // ArXiv
  search_arxiv: searchArxivDef,
  fetch_arxiv: fetchArxivDef,
  
  // OpenReview
  search_openreview: searchOpenReviewDef,
  fetch_openreview: fetchOpenReviewDef,
  
  // HuggingFace
  search_huggingface: searchHuggingFaceDef,
  fetch_huggingface_model: fetchHuggingFaceModelDef,
  
  // Papers With Code
  search_paperswithcode: searchPapersWithCodeDef,
  
  // Semantic Scholar
  search_semantic_scholar: searchSemanticScholarDef
}

// 所有学术工具名称列表
export const academicToolNames = Object.keys(academicToolDefinitions)
