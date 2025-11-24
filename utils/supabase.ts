/// <reference types="miniprogram-api-typings" />

// Supabase数据库服务模块
// 使用Supabase REST API

// Supabase配置
const SUPABASE_URL = 'https://sksspvosuxikkuslmgmc.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrc3Nwdm9zdXhpa2t1c2xtZ21jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0MDM5NTMsImV4cCI6MjA3Nzk3OTk1M30.ejLXhgwEITsJTUWZ5FH_aoMhPmwz3c2vnigA29xMffE'

// 数据库表名
export const TABLES = {
  CITIES: 'cities',
  PLACES: 'places',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites',
  ACCESSIBILITY_IMAGES: 'accessibility_images'
}

// Supabase REST API请求
async function supabaseRequest(table: string, options: {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: any
  select?: string
  filter?: Record<string, any>
  ilike?: Record<string, string> // 支持 ilike 查询（用于关键字搜索）
  or?: Array<{ column: string; operator: 'ilike' | 'eq'; value: string }> // 支持 OR 查询
  order?: { column: string; ascending?: boolean }
  limit?: number
} = {}) {
  const { method = 'GET', body, select, filter, ilike, or, order, limit } = options
  
  let url = `${SUPABASE_URL}/rest/v1/${table}`
  
  // 构建查询参数（Supabase PostgREST 格式）
  const queryParams: string[] = []
  // Supabase REST API 默认返回所有字段，但显式指定 select=* 更清晰
  if (select) {
    queryParams.push(`select=${encodeURIComponent(select)}`)
  } else if (method === 'GET') {
    // GET 请求如果没有指定 select，默认选择所有字段
    queryParams.push(`select=*`)
  }
  if (filter) {
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        // Supabase使用 .eq. 作为等于操作符
        // filter中的key应该已经是snake_case格式（如city_id），不需要转换
        queryParams.push(`${key}=eq.${encodeURIComponent(value)}`)
      }
    })
  }
  // 支持 ilike 查询（用于关键字搜索）
  if (ilike) {
    Object.entries(ilike).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        // Supabase 使用 .ilike.*keyword* 格式进行模糊搜索
        queryParams.push(`${key}=ilike.*${encodeURIComponent(value)}*`)
      }
    })
  }
  // 支持 OR 查询（用于多字段搜索）
  if (or && or.length > 0) {
    // Supabase PostgREST OR 查询格式：or=(field1.ilike.*value*,field2.ilike.*value*)
    // 注意：OR 查询需要放在 URL 参数中，格式为 or=(condition1,condition2)
    const orConditions = or.map(condition => {
      if (condition.operator === 'ilike') {
        // ilike 格式：column.ilike.*value*
        return `${condition.column}.ilike.*${encodeURIComponent(condition.value)}*`
      } else {
        // eq 格式：column.eq.value
        return `${condition.column}.eq.${encodeURIComponent(condition.value)}`
      }
    })
    // 使用括号包裹所有条件
    queryParams.push(`or=(${orConditions.join(',')})`)
  }
  if (order) {
    // order 列名应该已经是 snake_case（如 'name', 'accessibility_score'）
    // 不需要转换，直接使用
    queryParams.push(`order=${encodeURIComponent(order.column + '.' + (order.ascending ? 'asc' : 'desc'))}`)
  }
  if (limit) {
    queryParams.push(`limit=${limit}`)
  }
  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&')
  }
  
  console.log('Supabase请求URL:', url)
  
  const headers: Record<string, string> = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
  
  const requestOptions: WechatMiniprogram.RequestOption = {
    url,
    method: method as any,
    header: headers
  }
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    requestOptions.data = body
  }
  
  return new Promise((resolve, reject) => {
    console.log(`发起Supabase请求: ${method} ${table}`, {
      url: url,
      hasBody: !!body
    })
    
    wx.request({
      ...requestOptions,
      success: (res) => {
        console.log(`Supabase响应: ${method} ${table}`, {
          statusCode: res.statusCode,
          dataType: typeof res.data,
          isArray: Array.isArray(res.data),
          dataLength: Array.isArray(res.data) ? res.data.length : 'N/A'
        })
        
        // DELETE请求成功时，可能返回204 No Content或200 OK
        // 204表示成功但没有返回内容，200表示成功并返回删除的记录
        if (res.statusCode === 204 || (res.statusCode >= 200 && res.statusCode < 300)) {
          console.log(`✅ Supabase请求成功: ${method} ${table}`, {
            statusCode: res.statusCode,
            dataType: typeof res.data,
            isArray: Array.isArray(res.data),
            dataLength: Array.isArray(res.data) ? res.data.length : 'N/A',
            data: method === 'DELETE' ? (Array.isArray(res.data) ? `删除了${res.data.length}条记录` : '删除成功') : 'N/A'
          })
          
          // 对于DELETE请求，检查是否真的删除了记录
          if (method === 'DELETE') {
            if (res.statusCode === 204) {
              // 204表示删除成功，但没有返回内容
              console.log(`✅ DELETE请求成功（204 No Content），记录应该已被删除`)
            } else if (Array.isArray(res.data)) {
              // 200 + 数组：返回了删除的记录
              console.log(`✅ DELETE请求成功（200 OK），删除了${res.data.length}条记录`)
              if (res.data.length === 0) {
                console.warn(`⚠️ DELETE请求返回空数组，可能没有匹配到要删除的记录`)
              }
            }
          }
          
          // 204状态码时，res.data可能是undefined或null，这是正常的
          resolve(res.data || (method === 'DELETE' ? [] : res.data))
        } else {
          const errorMsg = `请求失败: ${res.statusCode} - ${JSON.stringify(res.data)}`
          console.error(`❌ Supabase请求失败: ${method} ${table}`, {
            statusCode: res.statusCode,
            data: res.data,
            url: url,
            headers: headers
          })
          reject(new Error(errorMsg))
        }
      },
      fail: (err) => {
        const errAny = err as Record<string, any>
        const rawMessage = (errAny && errAny.message) || ''
        const errMsg = err.errMsg || rawMessage

        console.error(`❌ Supabase请求网络错误: ${method} ${table}`, {
          err: err,
          errMsg: err.errMsg,
          errno: (errAny && errAny.errno),
          url: url,
          message: errMsg || '网络请求失败'
        })

        // 提供更友好的错误信息
        let errorMessage = '网络请求失败'
        if (errMsg) {
          if (errMsg.includes('域名不在白名单')) {
            errorMessage = '请在小程序设置中勾选"不校验合法域名"'
          } else if (errMsg.includes('timeout')) {
            errorMessage = '请求超时，请检查网络连接'
          } else {
            errorMessage = errMsg
          }
        }

        reject(new Error(errorMessage))
      }
    })
  })
}

// 转换景点数据格式：snake_case -> camelCase
function mapAccessibilityLevelToScore(level?: string | null) {
  if (!level) return 0
  const normalized = String(level).toUpperCase()
  switch (normalized) {
    case 'FULL':
      return 95
    case 'PARTIAL':
      return 75
    case 'HARD':
      return 40
    default:
      return 60
  }
}

function mapAccessibilityLevelToLabel(level?: string | null) {
  if (!level) return '一般'
  const normalized = String(level).toUpperCase()
  switch (normalized) {
    case 'FULL':
      return '完全可达'
    case 'PARTIAL':
      return '部分可达'
    case 'HARD':
      return '难以可达'
    default:
      return '一般'
  }
}

function mapAccessibilityLevelToWheelchair(level?: string | null) {
  if (!level) return 'unknown'
  const normalized = String(level).toUpperCase()
  switch (normalized) {
    case 'FULL':
      return 'suitable'
    case 'PARTIAL':
      return 'partial'
    case 'HARD':
      return 'not_suitable'
    default:
      return 'unknown'
  }
}

function mapSlopeConditionToLabel(slope?: string | null) {
  if (!slope) return ''
  const normalized = String(slope).toUpperCase()
  switch (normalized) {
    case 'FLAT':
      return '路面平缓'
    case 'PARTIAL_SLOPE':
      return '局部有坡'
    case 'STEEP':
      return '坡度较大'
    default:
      return ''
  }
}

function normalizeTextArray(value: string | null | undefined) {
  if (!value) return []
  if (typeof value !== 'string') return []
  
  // 先按分号、换行符分割
  let items = value.split(/[\n；;]+/).map(item => item.trim()).filter(Boolean)
  
  // 如果分割后只有一个长文本（超过25字符），尝试按逗号、顿号进一步分割
  if (items.length === 1 && items[0].length > 25) {
    const longText = items[0]
    // 尝试按逗号、顿号分割
    const commaSplit = longText.split(/[，、,]+/).map(item => item.trim()).filter(Boolean)
    // 如果分割后有多项，使用分割结果；否则保持原样
    if (commaSplit.length > 1) {
      items = commaSplit
    }
  }
  
  // 确保返回的数组不为空
  return items.length > 0 ? items : [value.trim()].filter(Boolean)
}

/**
 * 智能处理辅助设施：只在明确的列表分隔符处分割，保留完整句子
 * 不在逗号、顿号处分割，确保完整句子不被拆分
 */
function normalizeSupportServices(value: string | null | undefined) {
  if (!value) return []
  if (typeof value !== 'string') return []
  
  const text = value.trim()
  if (!text) return []
  
  // 智能断句规则：
  // 1. 只在分号（；）、换行符（\n）、英文分号（;）处分割
  // 2. 不在逗号（，）、顿号（、）处分割，以保留完整句子
  
  // 先按分号、换行符分割（这些是明确的列表分隔符）
  let items = text.split(/[\n；;]+/).map(item => item.trim()).filter(Boolean)
  
  // 如果没有找到分号/换行符，说明整个文本是一个完整句子，保持原样
  if (items.length === 0 || (items.length === 1 && items[0] === text)) {
    return [text.trim()].filter(Boolean)
  }
  
  // 对每个分段，保持原样，不按逗号、顿号进一步分割
  // 因为逗号、顿号可能是句子内部的并列，不应该分割
  return items.length > 0 ? items : [text.trim()].filter(Boolean)
}

/**
 * 智能处理可达区域：只在明确的列表分隔符处分割，保留完整句子
 * 不在逗号、顿号处分割，确保"可顺接江汉关、黎黄陂路等街区"这样的完整句子不被拆分
 */
function normalizeAccessibleAreas(value: string | null | undefined) {
  if (!value) return []
  if (typeof value !== 'string') return []
  
  const text = value.trim()
  if (!text) return []
  
  // 智能断句规则：
  // 1. 只在分号（；）、换行符（\n）、英文分号（;）处分割
  // 2. 不在逗号（，）、顿号（、）处分割，以保留完整句子
  // 3. 识别完整句子模式（包含"等"、"及"、"可顺接"等）
  
  // 先按分号、换行符分割（这些是明确的列表分隔符）
  let items = text.split(/[\n；;]+/).map(item => item.trim()).filter(Boolean)
  
  // 如果没有找到分号/换行符，说明整个文本是一个完整句子，保持原样
  if (items.length === 0 || (items.length === 1 && items[0] === text)) {
    return [text.trim()].filter(Boolean)
  }
  
  // 对每个分段，检查是否是完整句子，如果是则保持原样
  // 完整句子的特征：
  // - 包含"等"、"及"、"和"等连接词
  // - 以"可"、"能"、"可顺接"等动词开头
  // - 包含"等街区"、"等区域"等完整描述
  const processedItems: string[] = []
  for (const item of items) {
    const trimmed = item.trim()
    if (!trimmed) continue
    
    // 检查是否是完整句子模式
    const isCompleteSentence = 
      /[等及和与]/.test(trimmed) ||  // 包含连接词
      /^(可|能|可顺接|可到达|可前往|包括|涵盖|连接)/.test(trimmed) ||  // 以动词开头
      /等(街区|区域|地方|场所|景点)/.test(trimmed) ||  // 包含"等+名词"模式
      trimmed.length < 30  // 短文本通常是完整描述
    
    // 无论是否识别为完整句子，都保持原样，不按逗号、顿号进一步分割
    // 因为逗号、顿号可能是句子内部的并列，不应该分割
    processedItems.push(trimmed)
  }
  
  return processedItems.length > 0 ? processedItems : [text.trim()].filter(Boolean)
}

/**
 * 简单的字符串哈希函数，用于生成稳定的数字
 */
function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  return Math.abs(hash)
}

/**
 * 常见景点的真实图片映射表
 * 所有图片都是 Unsplash 的真实景点图片
 * 可以根据需要扩展这个映射表
 */
const PLACE_IMAGE_MAP: Record<string, string> = {
  // 武汉景点
  '东湖绿道': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '黄鹤楼': 'https://images.unsplash.com/photo-1591604466377-1a63d39d0a0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '武汉大学': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '户部巷': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '武侯祠博物馆': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '武侯祠': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '东湖': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  
  // 杭州景点
  '西湖公园': 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '西湖': 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '雷峰塔': 'https://images.unsplash.com/photo-1638888197213-2c0f0b4d0b8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '灵隐寺': 'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  
  // 北京景点
  '故宫': 'https://images.unsplash.com/photo-1523413650179-4b23b8c7c3b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '天安门': 'https://images.unsplash.com/photo-1523413650179-4b23b8c7c3b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '天坛': 'https://images.unsplash.com/photo-1523413650179-4b23b8c7c3b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '颐和园': 'https://images.unsplash.com/photo-1523413650179-4b23b8c7c3b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '长城': 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  
  // 上海景点
  '外滩': 'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '东方明珠': 'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '豫园': 'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  
  // 通用类别图片（真实的相关图片）
  '公园': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '景点': 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '博物馆': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '纪念馆': 'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '寺庙': 'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '山': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '湖': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '绿道': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '广场': 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '美食街': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '校园': 'https://images.unsplash.com/photo-1509062522246-3755977927d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  '景点': 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
}

function buildPlaceTags(place: any) {
  const tags: string[] = []
  const levelLabel = mapAccessibilityLevelToLabel(place.accessibility_level)
  if (levelLabel) tags.push(levelLabel)

  const slopeLabel = mapSlopeConditionToLabel(place.slope_condition)
  if (slopeLabel) tags.push(slopeLabel)

  if (place.has_accessible_restroom) tags.push('有无障碍厕所')
  if (place.support_services) tags.push('提供协助')
  if (place.recommended_route) tags.push('有推荐路线')

  if (Array.isArray(place.tags)) {
    place.tags.forEach((tag: string) => {
      if (tag) tags.push(tag)
    })
  }
  return Array.from(new Set(tags))
}

function convertPlaceToCamelCase(place: any, accessibilityImages: any[] = []) {
  const id = place.poi_id || place.id
  const name = place.poi_name || place.name || ''
  const summaryShort = place.summary_short || place.description || ''
  const accessibilityLevel = place.accessibility_level || place.accessibilityLevel || 'UNKNOWN'
  const accessibilityScore = (place.accessibility_score != null) ? place.accessibility_score : mapAccessibilityLevelToScore(accessibilityLevel)
  const accessibilityLabel = place.accessibility_label || mapAccessibilityLevelToLabel(accessibilityLevel)
  const wheelchairFriendly = place.wheelchair_friendly || mapAccessibilityLevelToWheelchair(accessibilityLevel)
  const slopeConditionLabel = mapSlopeConditionToLabel(place.slope_condition)

  const surfaceCondition = place.surface_condition || slopeConditionLabel
  // 使用智能分割，只在分号、换行符处分割，保留完整句子（类似 normalizeAccessibleAreas）
  const supportServicesList = normalizeSupportServices(place.support_services)
  const entryAccessList = normalizeTextArray(place.entry_access)
  // 可达区域使用智能断句：只在分号、换行符处分割，不在逗号、顿号处分割
  const accessibleAreasList = normalizeAccessibleAreas(place.accessible_areas)
  // 如果数据库中有提取好的关键词，直接使用；否则在前端提取
  const accessibleAreasKeywords = Array.isArray(place.accessible_areas_keywords) 
    ? place.accessible_areas_keywords 
    : []
  const recommendedRouteList = normalizeTextArray(place.recommended_route)
  const cautionList = normalizeTextArray(place.cautions)
  
  // 读取三个设施的详情字段（优先使用专门提取的详情）
  const elevatorDetails = place.elevator_details || null
  const wheelchairRentalDetails = place.wheelchair_rental_details || null
  const accessibleRestroomDetails = place.accessible_restroom_details || null

  const sources = Array.isArray(place.sources) ? place.sources : normalizeTextArray(place.sources)

  // 只使用数据库中的真实图片，不自动生成虚假图片
  const existingImageUrl = place.image_url || null
  const existingImages = Array.isArray(place.images) && place.images.length > 0
    ? place.images 
    : (place.image_url ? [place.image_url] : [])
  
  // 如果数据库中有图片，使用数据库的图片
  // 如果数据库中没有图片，返回 null 或空数组，让前端处理（不显示图片或显示占位符）
  const finalImageUrl = existingImageUrl || null
  const finalImages = existingImages.length > 0 ? existingImages : []

  // 优先使用 ai_score_total，如果没有则使用其他分数
  const aiScoreTotal = place.ai_score_total !== undefined && place.ai_score_total !== null 
    ? Number(place.ai_score_total) 
    : null
  const finalScore = aiScoreTotal !== null ? aiScoreTotal : accessibilityScore

  // 处理无障碍图片数据
  // 转换为前端友好的格式，支持多场景展示
  const processedAccessibilityImages = accessibilityImages.map(img => ({
    id: img.id,
    url: img.image_url,
    category: img.category || 'general',
    description: img.description || '',
    categoryLabel: getCategoryLabel(img.category),
    relatedField: img.related_field || null, // 关联的字段名
    displayPriority: img.display_priority || 100, // 显示优先级
    isCover: img.is_cover || false // 是否为封面图
  }));

  // 按优先级排序
  processedAccessibilityImages.sort((a, b) => a.displayPriority - b.displayPriority);

  // 提取封面图（用于列表展示）
  const coverImage = processedAccessibilityImages.find(img => img.isCover) || 
                     processedAccessibilityImages.find(img => img.category === 'cover') ||
                     processedAccessibilityImages.find(img => img.category === 'entrance') ||
                     processedAccessibilityImages[0] || null;

  // 按关联字段分组图片（用于在对应字段旁展示）
  const imagesByField: Record<string, any[]> = {};
  processedAccessibilityImages.forEach(img => {
    if (img.relatedField) {
      if (!imagesByField[img.relatedField]) {
        imagesByField[img.relatedField] = [];
      }
      imagesByField[img.relatedField].push(img);
    }
  });

  // 按分类分组图片
  const imagesByCategory: Record<string, any[]> = {};
  processedAccessibilityImages.forEach(img => {
    const cat = img.category || 'general';
    if (!imagesByCategory[cat]) {
      imagesByCategory[cat] = [];
    }
    imagesByCategory[cat].push(img);
  });

  return {
    id,
    cityId: place.city_id,
    name,
    rating: finalScore,
    score: finalScore,
    aiScoreTotal: aiScoreTotal, // 添加 aiScoreTotal 字段
    category: place.category,
    accessibilityScore,
    accessibilityLevel,
    accessibilityLabel,
    distance: place.distance,
    duration: place.duration,
    description: summaryShort,
    intro: summaryShort,
    entryAccess: entryAccessList,
    accessibleAreas: accessibleAreasList,
    accessibleAreasKeywords: accessibleAreasKeywords, // AI提取的关键词，用于卡片显示
    supportServices: supportServicesList,
    elevatorDetails: elevatorDetails, // 电梯详情（优先使用）
    wheelchairRentalDetails: wheelchairRentalDetails, // 轮椅租借详情（优先使用）
    accessibleRestroomDetails: accessibleRestroomDetails, // 无障碍洗手间详情（优先使用）
    recommendedRoute: recommendedRouteList,
    cautions: cautionList,
    evidenceStatus: place.evidence_status,
    surfaceCondition,
    slopeCondition: place.slope_condition,
    sourcePosCount: (place.source_pos_count != null) ? place.source_pos_count : 0,
    sourceNegCount: (place.source_neg_count != null) ? place.source_neg_count : 0,
    sourceVariety: (place.source_variety != null) ? place.source_variety : 0,
    sourceRecencyDays: (place.source_recency_days != null) ? place.source_recency_days : null,
    sources,
    keywordsUsed: place.keywords_used || [],
    summaryShort,
    tags: buildPlaceTags(place),
    hasAccessibleRestroom: (place.has_accessible_restroom != null) ? place.has_accessible_restroom : false,
    hasElevator: (place.has_elevator != null) ? place.has_elevator : false,
    hasParking: (place.has_parking != null) ? place.has_parking : false,
    location: place.location || place.address || '',
    wheelchairFriendly,
    surfaceConditionDetail: place.surface_condition,
    terrainNotes: place.terrain_notes || summaryShort,
    imageUrl: coverImage?.url || finalImageUrl, // 优先使用封面图，否则使用原有图片
    images: finalImages, // 只使用数据库中的真实图片
    cover: coverImage?.url || finalImageUrl || undefined, // 封面图（用于列表展示）
    phone: place.phone,
    email: place.email,
    hours: place.hours,
    address: place.address,
    website: place.website,
    accessibilityImages: processedAccessibilityImages, // 所有无障碍图片列表（按优先级排序）
    accessibilityImagesByField: imagesByField, // 按字段分组的图片（如: { entry_access: [...], surface_condition: [...] }）
    accessibilityImagesByCategory: imagesByCategory, // 按分类分组的图片（如: { slope: [...], elevator: [...] }）
    detailedInfo: {
      phone: place.phone,
      email: place.email,
      hours: place.hours,
      address: place.address,
      website: place.website,
      accessibilityDetails: {
        terrain: place.terrain_notes || '',
        entrances: entryAccessList.join('；'),
        parking: supportServicesList.find(text => text.includes('停车')) || '',
        restrooms: supportServicesList.find(text => text.includes('厕所') || text.includes('卫生间')) || '',
        elevators: supportServicesList.find(text => text.includes('电梯')) || '',
        pathways: accessibleAreasList.join('；'),
        seating: ''
      },
      entryAccess: entryAccessList,
      accessibleAreas: accessibleAreasList,
      accessibleAreasKeywords: accessibleAreasKeywords, // AI提取的关键词，用于卡片显示
      supportServices: supportServicesList
    }
  }
}

// 辅助函数：获取分类的中文标签
function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'cover': return '封面';
    case 'entrance': return '入口';
    case 'surface': return '路面';
    case 'accessible_area': return '可达区域';
    case 'slope': return '坡道';
    case 'elevator': return '直梯';
    case 'restroom': return '无障碍卫生间';
    case 'parking': return '无障碍车位';
    case 'wheelchair_rental': return '轮椅租借';
    case 'general': return '概览';
    default: return '设施';
  }
}

/**
 * 获取所有城市列表
 */
export async function getCities() {
  try {
    console.log('开始获取城市列表...')
    const data = await supabaseRequest(TABLES.CITIES, {
      select: '*',
      order: { column: 'name', ascending: true }
    }) as any[]
    
    console.log('getCities 收到数据:', (data && data.length) || 0, '个城市')
    
    if (!Array.isArray(data)) {
      throw new Error('返回数据格式错误，期望数组')
    }
    
    // 转换字段名：snake_case -> camelCase
    const cities = data.map(city => ({
      id: city.id,
      name: city.name,
      description: city.description,
      imageUrl: city.image_url,
      attractionCount: city.attraction_count || 0
    }))
    
    console.log('getCities 转换后:', cities.length, '个城市')
    return cities
  } catch (error: any) {
    console.error('getCities error:', error)
    console.error('getCities 错误详情:', (error && error.message), error)
    throw error
  }
}

/**
 * 根据城市ID获取景点列表
 */
export async function getPlacesByCity(cityId: string) {
  try {
    const data = await supabaseRequest(TABLES.PLACES, {
      select: '*',
      filter: { city_id: cityId },
      order: { column: 'updated_at', ascending: false }
    }) as any[]
    return data.map(place => convertPlaceToCamelCase(place))
  } catch (error) {
    console.error('getPlacesByCity error:', error)
    throw error
  }
}

/**
 * 根据关键字和筛选条件搜索景点
 * 优化：在数据库层面进行搜索，减少数据传输和处理
 */
export async function searchPlaces(options: {
  cityId?: string
  keyword?: string
  filters?: string[]
  selectedCityId?: string | null
}) {
  try {
    console.log('searchPlaces called with options:', options)
    const startTime = Date.now()
    
    // 构建查询选项
    const queryOptions: any = {
      // 先使用 select=* 获取所有字段，避免字段不匹配问题
      // 后续可以根据实际数据库结构优化
      select: '*',
      order: { column: 'ai_score_total', ascending: false } // 优先按 AI 评分排序，如果没有则按 updated_at
    }
    
    // 如果有城市ID，添加过滤
    if (options.cityId) {
      console.log('查询城市景点, cityId:', options.cityId)
      queryOptions.filter = { city_id: options.cityId }
    }
    
    // 如果有关键字，在数据库层面进行搜索（使用 OR 查询多个字段）
    let rawPlaces: any[] = []
    if (options.keyword && options.keyword.trim()) {
      const keyword = options.keyword.trim()
      console.log('数据库层面关键字搜索:', keyword)
      
      try {
        // 使用 OR 查询在多个字段中搜索关键字
        queryOptions.or = [
          { column: 'poi_name', operator: 'ilike', value: keyword },
          { column: 'description', operator: 'ilike', value: keyword },
          { column: 'summary_short', operator: 'ilike', value: keyword }
        ]
        
        // 执行查询
        rawPlaces = await supabaseRequest(TABLES.PLACES, queryOptions) as any[]
      } catch (orError) {
        console.warn('OR 查询失败，回退到客户端搜索:', orError)
        // 如果 OR 查询失败，回退到先查询所有数据，然后在客户端搜索
        delete queryOptions.or
        rawPlaces = await supabaseRequest(TABLES.PLACES, queryOptions) as any[]
      }
    } else {
      // 没有关键字，直接查询
      rawPlaces = await supabaseRequest(TABLES.PLACES, queryOptions) as any[]
    }
    
    console.log('searchPlaces 查询结果数量:', (rawPlaces && rawPlaces.length) || 0)
    
    // 转换数据格式（只转换查询到的字段）
    const places = rawPlaces.map(place => {
      // 简化转换，只处理列表页需要的字段
      const id = place.poi_id || place.id
      const name = place.poi_name || place.name || ''
      const aiScoreTotal = place.ai_score_total !== undefined && place.ai_score_total !== null 
        ? Number(place.ai_score_total) 
        : null
      const finalScore = aiScoreTotal !== null ? aiScoreTotal : (place.rating || place.score || 0)
      
      return {
        id,
        cityId: place.city_id,
        name,
        rating: finalScore,
        score: finalScore,
        aiScoreTotal: aiScoreTotal,
        category: place.category,
        accessibilityScore: place.accessibility_score || 0,
        accessibilityLevel: place.accessibility_level || 'good',
        accessibilityLabel: place.accessibility_label || '良好',
        distance: place.distance || '',
        duration: place.duration || '',
        description: place.summary_short || place.description || '',
        imageUrl: place.image_url || (Array.isArray(place.images) && place.images.length > 0 ? place.images[0] : null),
        cover: place.image_url || (Array.isArray(place.images) && place.images.length > 0 ? place.images[0] : null),
        tags: Array.isArray(place.tags) ? place.tags : [],
        hasAccessibleRestroom: place.has_accessible_restroom || false,
        hasElevator: place.has_elevator || false,
        hasParking: place.has_parking || false
      }
    })
    
    // 客户端筛选
    let filtered = places
    
    // 如果有关键字但 OR 查询失败，在客户端进行关键字筛选
    if (options.keyword && options.keyword.trim() && rawPlaces.length > 0) {
      const keyword = options.keyword.trim().toLowerCase()
      // 检查是否所有结果都匹配关键字（如果都不匹配，说明 OR 查询可能失败了）
      const allMatch = filtered.every(place => 
        (place.name && place.name.toLowerCase().includes(keyword)) ||
        (place.description && place.description.toLowerCase().includes(keyword))
      )
      
      // 如果结果不匹配关键字，说明 OR 查询可能失败了，在客户端筛选
      if (!allMatch && filtered.length > 0) {
      filtered = filtered.filter(place => 
        (place.name && place.name.toLowerCase().includes(keyword)) ||
          (place.description && place.description.toLowerCase().includes(keyword))
        )
      }
    }
    
    // 标签筛选（tags 是数组，数据库查询较复杂，在客户端筛选）
    if (options.filters && options.filters.length > 0) {
      filtered = filtered.filter(place => {
        const placeTags = place.tags || []
        return options.filters!.some(filter => 
          Array.isArray(placeTags) ? placeTags.includes(filter) : false
        )
      })
    }
    
    const endTime = Date.now()
    console.log(`searchPlaces 完成，耗时: ${endTime - startTime}ms，返回 ${filtered.length} 条结果`)
    
    return filtered
  } catch (error) {
    console.error('searchPlaces error:', error)
    throw error
  }
}

/**
 * 根据ID获取景点详情
 */
export async function getPlaceDetail(id: string) {
  try {
    // 并行请求: 景点详情 + 无障碍图片
    const [placeData, imagesData] = await Promise.all([
      supabaseRequest(TABLES.PLACES, {
        select: '*',
        filter: { poi_id: id },
        limit: 1
      }) as Promise<any[]>,
      
      supabaseRequest(TABLES.ACCESSIBILITY_IMAGES, {
        select: '*',
        filter: { place_id: id },
        order: { column: 'created_at', ascending: true }
      }) as Promise<any[]>
    ]);

    const place = placeData[0]
    if (!place) return null
    
    return convertPlaceToCamelCase(place, imagesData || [])
  } catch (error) {
    console.error('getPlaceDetail error:', error)
    throw error
  }
}

/**
 * 提交评价
 */
export async function addReview(review: {
  placeId: string
  placeName: string
  rating: number
  surfaceCondition: string
  stepCondition: string
  needsAssistance: boolean
  recommendation: string
  facilities: Record<string, boolean>
  content: string
  userId?: string
}) {
  try {
    const data = await supabaseRequest(TABLES.REVIEWS, {
      method: 'POST',
      body: {
        place_id: review.placeId,
        place_name: review.placeName,
        rating: review.rating,
        surface_condition: review.surfaceCondition,
        step_condition: review.stepCondition,
        needs_assistance: review.needsAssistance,
        recommendation: review.recommendation,
        facilities: review.facilities,
        content: review.content,
        user_id: review.userId || null
      }
    })
    return data
  } catch (error) {
    console.error('addReview error:', error)
    throw error
  }
}

/**
 * 获取景点的评价列表
 */
export async function getPlaceReviews(placeId: string) {
  try {
    const data = await supabaseRequest(TABLES.REVIEWS, {
      select: '*',
      filter: { place_id: placeId },
      order: { column: 'created_at', ascending: false }
    }) as any[]
    return data
  } catch (error) {
    console.error('getPlaceReviews error:', error)
    throw error
  }
}

/**
 * 获取用户的评价列表
 */
export async function getUserReviews(userId: string) {
  try {
    const data = await supabaseRequest(TABLES.REVIEWS, {
      select: '*',
      filter: { user_id: userId },
      order: { column: 'created_at', ascending: false }
    }) as any[]
    // 转换为前端需要的格式
    return data.map((review: any) => ({
      id: review.id,
      placeId: review.place_id,
      placeName: review.place_name,
      score: review.rating,
      summary: review.content ? (review.content.length > 20 ? review.content.substring(0, 20) + '...' : review.content) : '',
      rating: review.rating,
      surfaceCondition: review.surface_condition,
      needsAssistance: review.needs_assistance,
      recommendation: review.recommendation,
      content: review.content,
      facilities: review.facilities,
      createdAt: review.created_at
    }))
  } catch (error) {
    console.error('getUserReviews error:', error)
    throw error
  }
}

/**
 * 获取单条评论详情（用于编辑）
 */
export async function getReview(reviewId: string) {
  try {
    const data = await supabaseRequest(TABLES.REVIEWS, {
      select: '*',
      filter: { id: reviewId }
    }) as any[]
    
    if (!data || data.length === 0) {
      return null
    }
    
    const review = data[0]
    return {
      id: review.id,
      placeId: review.place_id,
      placeName: review.place_name,
      rating: review.rating,
      surfaceCondition: review.surface_condition,
      stepCondition: review.step_condition,
      needsAssistance: review.needs_assistance,
      recommendation: review.recommendation,
      facilities: review.facilities,
      content: review.content,
      userId: review.user_id,
      createdAt: review.created_at
    }
  } catch (error) {
    console.error('getReview error:', error)
    throw error
  }
}

/**
 * 更新评论
 */
export async function updateReview(reviewId: string, review: {
  rating: number
  surfaceCondition: string
  stepCondition: string
  needsAssistance: boolean
  recommendation: string
  facilities: Record<string, boolean>
  content: string
}) {
  try {
    const data = await supabaseRequest(TABLES.REVIEWS, {
      method: 'PATCH',
      filter: { id: reviewId },
      body: {
        rating: review.rating,
        surface_condition: review.surfaceCondition,
        step_condition: review.stepCondition,
        needs_assistance: review.needsAssistance,
        recommendation: review.recommendation,
        facilities: review.facilities,
        content: review.content,
        updated_at: new Date().toISOString()
      }
    })
    return data
  } catch (error) {
    console.error('updateReview error:', error)
    throw error
  }
}

/**
 * 删除评论
 * @param reviewId 评论ID
 * @param userId 可选的用户ID，用于RLS策略验证（如果RLS策略要求）
 */
export async function deleteReview(reviewId: string, userId?: string) {
  try {
    console.log('deleteReview: 开始删除评论，ID:', reviewId, 'userId:', userId)
    
    if (!reviewId || reviewId.trim() === '') {
      throw new Error('评论ID不能为空')
    }
    
    // 先验证评论是否存在
    const beforeDelete = await supabaseRequest(TABLES.REVIEWS, {
      select: 'id,user_id',
      filter: { id: reviewId },
      limit: 1
    }) as any[]
    
    console.log('deleteReview: 删除前验证，找到记录数:', (beforeDelete && beforeDelete.length) || 0)
    if (beforeDelete && beforeDelete.length > 0) {
      console.log('deleteReview: 要删除的记录:', beforeDelete[0])
      
      // 如果提供了userId，验证是否是自己的评论
      if (userId && beforeDelete[0].user_id !== userId) {
        throw new Error('无权删除他人的评论')
      }
    } else {
      console.warn('deleteReview: 警告：要删除的记录不存在，ID:', reviewId)
      // 如果记录不存在，也认为删除成功（幂等性）
      return []
    }
    
    // Supabase DELETE请求：使用 id=eq.{reviewId} 格式
    // 如果提供了userId，同时添加user_id条件（有助于RLS策略）
    const deleteFilter: Record<string, any> = { id: reviewId }
    if (userId) {
      deleteFilter.user_id = userId
    }
    
    console.log('deleteReview: 发送DELETE请求，filter:', deleteFilter)
    console.log('deleteReview: DELETE URL应该包含: id=eq.' + reviewId + (userId ? '&user_id=eq.' + userId : ''))
    
    // 记录删除前的状态
    const deleteUrl = `${SUPABASE_URL}/rest/v1/${TABLES.REVIEWS}?id=eq.${encodeURIComponent(reviewId)}${userId ? `&user_id=eq.${encodeURIComponent(userId)}` : ''}`
    console.log('deleteReview: 完整DELETE URL:', deleteUrl)
    
    const data = await supabaseRequest(TABLES.REVIEWS, {
      method: 'DELETE',
      filter: deleteFilter
    })
    
    console.log('deleteReview: 删除请求完成，返回数据:', data)
    console.log('deleteReview: 返回数据类型:', typeof data, Array.isArray(data) ? `数组长度: ${data.length}` : '非数组')
    
    // 检查DELETE请求的响应
    // 如果返回空数组或空响应，说明可能没有匹配到记录
    if (Array.isArray(data) && data.length === 0) {
      console.warn('⚠️ deleteReview: DELETE请求返回空数组，可能没有匹配到记录')
      console.warn('⚠️ deleteReview: 这可能是因为filter条件不匹配，或者RLS策略阻止了删除')
    }
    
    // 立即验证删除是否成功
    await new Promise(resolve => setTimeout(resolve, 500))
    
    try {
      const checkData = await supabaseRequest(TABLES.REVIEWS, {
        select: 'id',
        filter: { id: reviewId },
        limit: 1
      }) as any[]
      
      if (checkData && checkData.length > 0) {
        console.error('❌ deleteReview: 删除失败！评论仍然存在，ID:', reviewId)
        console.error('❌ deleteReview: 这可能是RLS策略问题或权限问题')
        console.error('❌ deleteReview: 建议检查Supabase的RLS策略，确保允许删除操作')
        // 如果删除失败，抛出错误
        throw new Error('删除失败：评论仍然存在于数据库中。可能是RLS策略阻止了删除操作，请检查Supabase的Row Level Security策略')
      } else {
        console.log('✅ deleteReview: 删除验证成功，评论已不存在，ID:', reviewId)
      }
    } catch (checkError: any) {
      // 如果验证查询失败，检查是否是删除失败的错误
      if (checkError.message && checkError.message.includes('删除失败')) {
        throw checkError
      }
      // 如果是其他错误（如网络问题），记录警告但不影响删除操作本身
      console.warn('deleteReview: 验证删除结果时出错（可能是网络问题）:', checkError)
    }
    
    // Supabase DELETE请求成功时：
    // - 如果使用 Prefer: return=representation，返回删除的记录（数组）
    // - 如果使用 Prefer: return=minimal，返回空响应或204状态码
    // 只要没有抛出错误，就认为删除成功
    return data
  } catch (error) {
    console.error('deleteReview error:', error)
    throw error
  }
}

/**
 * 添加收藏
 */
export async function addFavorite(userId: string, placeId: string) {
  try {
    const data = await supabaseRequest(TABLES.FAVORITES, {
      method: 'POST',
      body: {
        user_id: userId,
        place_id: placeId
      }
    })
    return data
  } catch (error) {
    console.error('addFavorite error:', error)
    throw error
  }
}

/**
 * 取消收藏
 */
export async function removeFavorite(userId: string, placeId: string) {
  try {
    // 先获取收藏记录ID
    const favorites = await supabaseRequest(TABLES.FAVORITES, {
      select: 'id',
      filter: {
        user_id: userId,
        place_id: placeId
      },
      limit: 1
    }) as any[]
    
    if (favorites.length === 0) {
      return { deleted: 0 }
    }
    
    // 使用DELETE请求删除
    const deleteUrl = `${SUPABASE_URL}/rest/v1/${TABLES.FAVORITES}?id=eq.${favorites[0].id}`
    return new Promise((resolve, reject) => {
      wx.request({
        url: deleteUrl,
        method: 'DELETE',
        header: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else {
            reject(new Error(`删除失败: ${res.statusCode}`))
          }
        },
        fail: reject
      })
    })
  } catch (error) {
    console.error('removeFavorite error:', error)
    throw error
  }
}

/**
 * 获取用户的收藏列表
 */
export async function getUserFavorites(userId: string) {
  try {
    // 先获取收藏记录
    const favorites = await supabaseRequest(TABLES.FAVORITES, {
      select: '*',
      filter: { user_id: userId }
    }) as any[]
    
    if (favorites.length === 0) {
      return []
    }
    
    // 获取收藏的景点详情
    const placeIds = favorites.map(f => f.place_id)
    const places = await Promise.all(
      placeIds.map(id => getPlaceDetail(id))
    )
    
    return places.filter(p => p !== null)
  } catch (error) {
    console.error('getUserFavorites error:', error)
    throw error
  }
}

/**
 * 检查用户是否已收藏
 */
export async function isFavorite(userId: string, placeId: string): Promise<boolean> {
  try {
    const data = await supabaseRequest(TABLES.FAVORITES, {
      select: 'id',
      filter: {
        user_id: userId,
        place_id: placeId
      },
      limit: 1
    }) as any[]
    return data.length > 0
  } catch (error) {
    console.error('isFavorite error:', error)
    return false
  }
}
