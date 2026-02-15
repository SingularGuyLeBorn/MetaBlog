---
layout: page
title: 文章列表
---

<script setup>
import SectionHub from '@/components/SectionHub.vue'
import { data as posts } from '../../data/posts.data'
</script>

<SectionHub section-type="posts" :index-data="posts" />
