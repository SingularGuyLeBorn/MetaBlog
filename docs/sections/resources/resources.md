---
layout: page
title: 公开资源
---

<script setup>
import SectionHub from '@/components/SectionHub.vue'
import { data as resources } from '../../data/resources.data'
</script>

<SectionHub section-type="resources" :index-data="resources" />
