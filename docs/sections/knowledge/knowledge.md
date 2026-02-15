---
layout: page
title: 知识库
---

<script setup>
import SectionHub from '@/components/SectionHub.vue';
import { data as knowledge } from '../../data/knowledge.data'
</script>

<SectionHub section-type="knowledge" :index-data="knowledge" />
