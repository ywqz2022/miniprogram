/**
 * 生成包含评分的 SQL INSERT 语句
 * 在数据整理后，直接调用此函数生成 SQL，包含AI评分
 * 
 * **重要：我们一直使用AI评分！不推荐规则评分。**
 * 
 * 注意：
 * 1. **必须使用AI评分**（语义理解），规则评分仅作为极端情况的后备
 * 2. **必须**在数据提取时同时提取 accessible_areas_keywords（可达区域关键词）
 *    参考 AI_FIELD_EXTRACTION_PROMPT.md 中的提取规则
 * 
 * 使用方式：
 * 1. 从xiaohongshu-mcp获取数据后，使用AI提取字段（包括accessible_areas_keywords）
 * 2. 在Cursor中告诉我："请对以下景点进行AI评分"
 * 3. 我会使用AI评分系统对景点进行评分
 * 4. 评分完成后，我会调用此函数生成SQL并写入Supabase
 * 
 * 或者：
 * 1. 如果已经完成AI评分和关键词提取，直接传入包含ai_score_*和accessible_areas_keywords字段的数据
 * 2. 此函数会生成包含AI评分和关键词的SQL语句
 * 
 * **如果缺少AI评分，函数会抛出错误提示需要先进行AI评分。**
 */

// import { addRatingToPlaceData, calculateAccessibilityScore } from './autoRating';

interface PlaceData {
  poi_id: string;
  poi_name: string;
  city_id: string;
  entry_access?: string | null;
  surface_condition?: string | null;
  accessible_areas?: string | null;
  accessible_areas_keywords?: string[] | null; // AI提取的关键词数组（必填，在数据提取时生成）
  support_services?: string | null;
  summary_short?: string | null;
  evidence_status?: string | null;
  source_pos_count?: number | null;
  raw_notes_summary?: string | null; // 原始帖子信息汇总（原始值、未作任何编辑），便于后续修改、调用等
  image_url?: string | null; // 封面图/代表图
  images?: string[] | null; // 所有相关图片列表
  images_categorized?: Record<string, string[]> | null; // 分类图片
  // 其他字段...
  category?: string;
  district?: string;
  aliases?: string[];
  sources?: string[];
  keywords_used?: string[];
  [key: string]: any;
}

/**
 * 转义 SQL 字符串
 */
function escapeSQL(str: string | null | undefined): string {
  if (!str) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

/**
 * 转义数组为 SQL 数组格式
 */
function escapeArray(arr: string[] | null | undefined): string {
  if (!arr || arr.length === 0) return 'ARRAY[]::TEXT[]';
  const escaped = arr.map(item => `'${String(item).replace(/'/g, "''")}'`).join(',');
  return `ARRAY[${escaped}]`;
}

function escapeJSON(obj: any): string {
  if (!obj) return "'{}'::jsonb";
  return `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
}

/**
 * 生成包含评分的 SQL INSERT 语句
 */
export function generatePlaceSQL(place: PlaceData): string {
  // **我们一直使用AI评分！**
  // 检查是否有AI评分
  const hasAIRating = place.ai_score_total !== undefined && place.ai_score_total !== null;
  
  if (!hasAIRating) {
    // 如果缺少AI评分，抛出错误提示需要先进行AI评分
    throw new Error(
      `❌ 景点 "${place.poi_name}" (${place.poi_id}) 缺少AI评分！\n` +
      `请先使用AI进行评分：\n` +
      `1. 在Cursor中告诉我："请对以下景点进行AI评分"\n` +
      `2. 我会使用AI评分系统对景点进行评分\n` +
      `3. 评分完成后，再调用此函数生成SQL\n\n` +
      `注意：我们一直使用AI评分，因为它更准确（语义理解）。`
    );
  }
  
  // 使用AI评分（我们一直使用AI评分）
  const rating = {
      score_total: place.ai_score_total,
      score_entry_access: place.ai_score_entry_access || 0,
      score_internal_access: place.ai_score_internal_access || 0,
      score_facility_support: place.ai_score_facility_support || 0,
      highlights: place.ai_rating_highlights || [],
      to_improve: place.ai_rating_to_improve || []
    };
  
  // 生成 SQL - 包含所有字段
  const sql = `INSERT INTO places (
  poi_id,
  poi_name,
  city_id,
  entry_access,
  surface_condition,
  accessible_areas,
  accessible_areas_keywords,
  support_services,
  recommended_route,
  cautions,
  elevator_details,
  wheelchair_rental_details,
  accessible_restroom_details,
  summary_short,
  evidence_status,
  source_pos_count,
  ai_score_total,
  ai_score_entry_access,
  ai_score_internal_access,
  ai_score_facility_support,
  ai_score_confidence,
  ai_rating_reasoning,
  ai_rating_highlights,
  ai_rating_to_improve,
  ai_rated_at,
  category,
  district,
  aliases,
  sources,
  keywords_used,
  raw_notes_summary,
  image_url,
  images,
  images_categorized,
  last_verified_at,
  updated_at
) VALUES (
  ${escapeSQL(place.poi_id)},
  ${escapeSQL(place.poi_name)},
  ${escapeSQL(place.city_id)},
  ${escapeSQL(place.entry_access)},
  ${escapeSQL(place.surface_condition)},
  ${escapeSQL(place.accessible_areas)},
  ${escapeArray(place.accessible_areas_keywords || [])}, -- AI提取的关键词，如果未提供则使用空数组
  ${escapeSQL(place.support_services)},
  ${escapeSQL(place.recommended_route)},
  ${escapeSQL(place.cautions)},
  ${escapeSQL(place.elevator_details)},
  ${escapeSQL(place.wheelchair_rental_details)},
  ${escapeSQL(place.accessible_restroom_details)},
  ${escapeSQL(place.summary_short)},
  ${escapeSQL(place.evidence_status)},
  ${place.source_pos_count ?? 'NULL'},
  ${rating.score_total},
  ${rating.score_entry_access},
  ${rating.score_internal_access},
  ${rating.score_facility_support},
  ${(typeof place.ai_score_confidence === 'number' ? place.ai_score_confidence : null) ?? 'NULL'},
  ${place.ai_rating_reasoning ? escapeSQL(place.ai_rating_reasoning) : 'NULL'},
  ${escapeArray(place.ai_rating_highlights || rating.highlights)},
  ${escapeArray(place.ai_rating_to_improve || rating.to_improve)},
  ${place.ai_rated_at ? escapeSQL(place.ai_rated_at) : 'NOW()'},
  ${escapeSQL(place.category)},
  ${escapeSQL(place.district)},
  ${escapeArray(place.aliases)},
  ${escapeArray(place.sources)},
  ${escapeArray(place.keywords_used)},
  ${escapeSQL(place.raw_notes_summary)},
  ${escapeSQL(place.image_url)},
  ${escapeArray(place.images || [])},
  ${escapeJSON(place.images_categorized)},
  ${place.last_verified_at ? escapeSQL(place.last_verified_at) : 'NOW()'},
  NOW()
)
ON CONFLICT (poi_id) DO UPDATE SET
  poi_name = EXCLUDED.poi_name,
  entry_access = EXCLUDED.entry_access,
  surface_condition = EXCLUDED.surface_condition,
  accessible_areas = EXCLUDED.accessible_areas,
  accessible_areas_keywords = COALESCE(EXCLUDED.accessible_areas_keywords, places.accessible_areas_keywords), -- 更新时保留已有值（如果新值为空）
  support_services = EXCLUDED.support_services,
  recommended_route = EXCLUDED.recommended_route,
  cautions = EXCLUDED.cautions,
  elevator_details = EXCLUDED.elevator_details,
  wheelchair_rental_details = EXCLUDED.wheelchair_rental_details,
  accessible_restroom_details = EXCLUDED.accessible_restroom_details,
  summary_short = EXCLUDED.summary_short,
  evidence_status = EXCLUDED.evidence_status,
  source_pos_count = EXCLUDED.source_pos_count,
  ai_score_total = EXCLUDED.ai_score_total,
  ai_score_entry_access = EXCLUDED.ai_score_entry_access,
  ai_score_internal_access = EXCLUDED.ai_score_internal_access,
  ai_score_facility_support = EXCLUDED.ai_score_facility_support,
  ai_score_confidence = EXCLUDED.ai_score_confidence,
  ai_rating_reasoning = EXCLUDED.ai_rating_reasoning,
  ai_rating_highlights = EXCLUDED.ai_rating_highlights,
  ai_rating_to_improve = EXCLUDED.ai_rating_to_improve,
  ai_rated_at = EXCLUDED.ai_rated_at,
  category = COALESCE(EXCLUDED.category, places.category),
  district = COALESCE(EXCLUDED.district, places.district),
  aliases = COALESCE(EXCLUDED.aliases, places.aliases),
  sources = COALESCE(EXCLUDED.sources, places.sources),
  keywords_used = COALESCE(EXCLUDED.keywords_used, places.keywords_used),
  raw_notes_summary = EXCLUDED.raw_notes_summary,
  image_url = COALESCE(EXCLUDED.image_url, places.image_url),
  images = COALESCE(EXCLUDED.images, places.images),
  images_categorized = COALESCE(EXCLUDED.images_categorized, places.images_categorized),
  last_verified_at = COALESCE(EXCLUDED.last_verified_at, places.last_verified_at, NOW()),
  updated_at = NOW();`;

  return sql;
}

/**
 * 批量生成 SQL
 */
export function generateBatchSQL(places: PlaceData[]): string {
  return places.map(place => generatePlaceSQL(place)).join('\n\n');
}

/**
 * 使用示例
 */
export function example() {
  const place: PlaceData = {
    poi_id: 'wuhan-gudeshi',
    poi_name: '古德寺',
    city_id: 'wuhan',
    entry_access: '从正门可直接推行进入，门槛平缓',
    slope_condition: 'FLAT',
    surface_condition: '场地为硬质铺装，整体平坦',
    accessible_areas: '大雄宝殿前院、回廊与广场地面平整，适合轮椅环行',
    accessible_areas_keywords: ['大雄宝殿前院', '回廊', '广场'], // AI提取的关键词
    support_services: '寺院工作人员与志愿者友好，可协助拍照',
    summary_short: '寺院庭院平坦宽敞，轮椅可直接进入拍照参观',
    evidence_status: 'VERIFIED',
    source_pos_count: 2
  };

  const sql = generatePlaceSQL(place);
  console.log(sql);
}

