// 数据库服务模块
// 使用微信云开发数据库

let db: any = null

// 初始化数据库连接
function initDB() {
  if (!db && wx.cloud) {
    try {
      db = wx.cloud.database()
    } catch (error) {
      console.error('数据库初始化失败:', error)
    }
  }
  return db
}

// 数据库集合名称
export const COLLECTIONS = {
  CITIES: 'cities',
  PLACES: 'places',
  REVIEWS: 'reviews',
  FAVORITES: 'favorites'
}

/**
 * 获取所有城市列表
 */
export async function getCities() {
  try {
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.CITIES)
      .orderBy('name', 'asc')
      .get()
    return result.data
  } catch (error) {
    console.error('getCities error:', error)
    throw error
  }
}

/**
 * 根据城市ID获取景点列表
 */
export async function getPlacesByCity(cityId: string) {
  try {
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.PLACES)
      .where({
        cityId: cityId
      })
      .orderBy('accessibilityScore', 'desc')
      .get()
    return result.data
  } catch (error) {
    console.error('getPlacesByCity error:', error)
    throw error
  }
}

/**
 * 根据关键字和筛选条件搜索景点
 */
export async function searchPlaces(options: {
  cityId?: string
  keyword?: string
  filters?: string[]
  selectedCityId?: string | null
}) {
  try {
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    
    let query = db.collection(COLLECTIONS.PLACES)
    
    // 如果有城市ID，按城市筛选
    if (options.cityId) {
      query = query.where({
        cityId: options.cityId
      })
    }
    
    // 如果有搜索关键字，按名称或描述搜索
    if (options.keyword) {
      query = query.where({
        $or: [
          { name: db.RegExp({ regexp: options.keyword, options: 'i' }) },
          { description: db.RegExp({ regexp: options.keyword, options: 'i' }) }
        ]
      })
    }
    
    // 按无障碍评分排序
    const result = await query
      .orderBy('accessibilityScore', 'desc')
      .get()

    type PlaceRecord = { tags?: string[] }
    let places = result.data as PlaceRecord[]

    // 客户端筛选（tag匹配）
    if (options.filters && options.filters.length > 0) {
      places = places.filter(place => {
        const tags = place.tags || []
        return options.filters!.some(filter => tags.includes(filter))
      })
    }
    
    return places
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
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.PLACES)
      .doc(id)
      .get()
    return result.data
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
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.REVIEWS)
      .add({
        data: {
          ...review,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      })
    return result._id
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
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.REVIEWS)
      .where({
        placeId: placeId
      })
      .orderBy('createTime', 'desc')
      .get()
    return result.data
  } catch (error) {
    console.error('getPlaceReviews error:', error)
    throw error
  }
}

/**
 * 添加收藏
 */
export async function addFavorite(userId: string, placeId: string) {
  try {
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.FAVORITES)
      .add({
        data: {
          userId,
          placeId,
          createTime: db.serverDate()
        }
      })
    return result._id
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
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.FAVORITES)
      .where({
        userId,
        placeId
      })
      .remove()
    return result.stats
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
    const db = initDB()
    if (!db) {
      throw new Error('云开发未初始化')
    }
    const result = await db.collection(COLLECTIONS.FAVORITES)
      .where({
        userId
      })
      .get()
    
    // 获取收藏的景点详情
    const placeIds = result.data.map((item: any) => item.placeId)
    if (placeIds.length === 0) {
      return []
    }
    
    const placesResult = await db.collection(COLLECTIONS.PLACES)
      .where({
        _id: db.command.in(placeIds)
      })
      .get()
    
    return placesResult.data
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
    const db = initDB()
    if (!db) {
      return false
    }
    const result = await db.collection(COLLECTIONS.FAVORITES)
      .where({
        userId,
        placeId
      })
      .count()
    return result.total > 0
  } catch (error) {
    console.error('isFavorite error:', error)
    return false
  }
}

