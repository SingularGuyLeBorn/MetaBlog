/**
 * 学术研究工具定义
 */

import type { ToolDefinition } from '../types'

export const searchArxivDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_arxiv',
    description: '搜索 ArXiv 学术论文。支持关键词、分类过滤。常用分类：cs.AI(AI), cs.CL(NLP), cs.CV(计算机视觉), cs.LG(机器学习)',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        category: { type: 'string', description: '分类过滤，如 cs.AI', default: '' },
        max_results: { type: 'number', description: '返回数量(1-50)', default: 10 },
        sort_by: { type: 'string', enum: ['relevance', 'lastUpdatedDate', 'submittedDate'], default: 'relevance' }
      },
      required: ['query']
    }
  }
}

export const fetchArxivDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_arxiv',
    description: '获取 ArXiv 论文详情，包括完整摘要、作者、PDF链接',
    parameters: {
      type: 'object',
      properties: {
        paper_id: { type: 'string', description: 'ArXiv 论文 ID，如 2401.12345' }
      },
      required: ['paper_id']
    }
  }
}

export const searchHuggingFaceDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_huggingface',
    description: '搜索 HuggingFace 模型库。支持模型名称、任务类型过滤',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词，如 bert, llama, gpt' },
        task: { type: 'string', description: '任务类型过滤，如 text-classification', default: '' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const fetchHuggingFaceModelDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_huggingface_model',
    description: '获取 HuggingFace 模型详情',
    parameters: {
      type: 'object',
      properties: {
        model_id: { type: 'string', description: '模型ID，如 bert-base-chinese' }
      },
      required: ['model_id']
    }
  }
}

export const searchPapersWithCodeDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_paperswithcode',
    description: '搜索 Papers With Code，获取带开源代码实现的论文',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const searchSemanticScholarDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_semantic_scholar',
    description: '搜索 Semantic Scholar 学术数据库，获取引用数等信息',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const searchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'search_openreview',
    description: '搜索 OpenReview 会议论文（ICLR, NeurIPS, ICML等）',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        venue: { type: 'string', description: '会议过滤，如 ICLR', default: '' },
        limit: { type: 'number', description: '返回数量', default: 10 }
      },
      required: ['query']
    }
  }
}

export const fetchOpenReviewDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'fetch_openreview',
    description: '获取 OpenReview 论文详情',
    parameters: {
      type: 'object',
      properties: {
        forum_id: { type: 'string', description: 'OpenReview Forum ID' }
      },
      required: ['forum_id']
    }
  }
}

export const academicToolDefinitions = {
  search_arxiv: searchArxivDef,
  fetch_arxiv: fetchArxivDef,
  search_huggingface: searchHuggingFaceDef,
  fetch_huggingface_model: fetchHuggingFaceModelDef,
  search_paperswithcode: searchPapersWithCodeDef,
  search_semantic_scholar: searchSemanticScholarDef,
  search_openreview: searchOpenReviewDef,
  fetch_openreview: fetchOpenReviewDef
}

export const academicToolNames = Object.keys(academicToolDefinitions)
