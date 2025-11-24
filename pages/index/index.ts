import { getCities, searchPlaces } from '../../utils/supabase'

Page({
  data: {
    activeTab: 'explore', // 当前激活的标签：explore 或 profile
    selectedCityId: null as string | null, // 当前选中的城市ID，null表示显示城市列表
    city: '杭州',
    keyword: '',
    activeKeyword: '',
    allFilters: ['平路多', '有电梯', '有卫生间', '停车近'],
    selectedFilters: [] as string[],
    loading: true,
    // 筛选状态
    minRating: null as number | null, // 最低评分筛选：3、4、5，null表示不筛选
    selectedCategory: null as string | null, // 选中的景点类型
    availableCategories: [] as string[], // 可用的景点类型列表
    ratingPickerRange: ['全部', '5分', '4分+', '3分+'], // 评分筛选选项
    ratingPickerIndex: 0, // 评分 picker 当前选中的索引
    categoryPickerRange: [] as Array<{label: string; value: string | null}>, // picker 组件的数据源
    categoryPickerIndex: 0, // picker 组件当前选中的索引
    showRatingDropdown: false, // 评分下拉菜单显示状态
    showCategoryDropdown: false, // 景点类型下拉菜单显示状态
    cities: [] as Array<{
      id: string;
      name: string;
      description: string;
      imageUrl: string;
      attractionCount: number;
    }>,
    places: [] as Array<{
      id: string;
      name: string;
      score?: number;
      rating?: number;
      cover?: string;
      imageUrl?: string;
      tags?: string[];
      category?: string;
      accessibilityScore?: number;
      accessibilityLevel?: string;
      accessibilityLabel?: string;
      distance?: string;
      duration?: string;
      description?: string;
      hasAccessibleRestroom?: boolean;
      hasElevator?: boolean;
      hasParking?: boolean;
      cityId?: string;
    }>,
    filtered: [] as Array<{
      cityId?: string;
      id: string;
      name: string;
      score?: number;
      rating?: number;
      cover?: string;
      imageUrl?: string;
      tags?: string[];
      category?: string;
      accessibilityScore?: number;
      accessibilityLevel?: string;
      accessibilityLabel?: string;
      distance?: string;
      duration?: string;
      description?: string;
      hasAccessibleRestroom?: boolean;
      hasElevator?: boolean;
      hasParking?: boolean;
    }>,
    searchResults: [] as Array<{
      key: string;
      type: 'city' | 'place';
      id: string;
      name: string;
      subtitle?: string;
      image?: string;
      cityId?: string;
      rating?: number;
    }>,
    searching: false,
    citySummaries: [] as Array<{
      id: string;
      name: string;
      region?: string;
      total: number;
      fullyAccessible: number;
      totalDelta?: number;
      accessibleDelta?: number;
      trendLabel?: string;
      trendTone?: 'positive' | 'warning' | 'neutral';
    }>,
    featuredCities: [] as Array<{
      id: string;
      name: string;
      imageUrl: string;
      description?: string;
    }>,
    activeCity: null as {
      id: string;
      name: string;
      description?: string;
      imageUrl?: string;
    } | null,
    cityHeroFallback: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1080&q=80',
    globalStats: {
      cityCount: 0,
      placeCount: 0,
      sourceCount: 0
    },
    heroIcon: '', // 图标已移除，使用emoji替代
    sectionIcon: '' // 图标已移除，使用emoji替代
  },
  searchTimer: null as number | null,
  _navigating: false, // 防止重复跳转
  onLoad(query: Record<string, string | undefined> = {}) {
    // 保存 cityId 参数，等数据加载完成后再处理
    const cityIdFromQuery = query.cityId ? query.cityId : null

    // 从数据库加载数据
    this.initData().then(() => {
      // 数据加载完成后，如果URL中有cityId参数，自动选择该城市
      if (cityIdFromQuery) {
        const city = this.data.cities.find(c => c.id === cityIdFromQuery)
        if (city) {
          this.setData({
            selectedCityId: cityIdFromQuery,
            city: city.name,
            keyword: '',
            selectedFilters: [],
            activeCity: this.normalizeCity(city)
          })
          // 动态设置导航栏标题，确保显示返回按钮
          wx.setNavigationBarTitle({
            title: city.name + '景点'
          })
          // 应用过滤
          this.applyFilter()
        }
      }
    }).catch(() => {
      // 如果数据加载失败，也尝试处理 cityId
      if (cityIdFromQuery) {
        const city = this.data.cities.find(c => c.id === cityIdFromQuery)
        if (city) {
          this.setData({
            selectedCityId: cityIdFromQuery,
            city: city.name,
            keyword: '',
            selectedFilters: [],
            activeCity: this.normalizeCity(city)
          })
          // 动态设置导航栏标题，确保显示返回按钮
          wx.setNavigationBarTitle({
            title: city.name + '景点'
          })
          this.applyFilter()
        }
      }
    })
  },
  onShow() {
    // 页面显示时（包括从其他页面返回），确保状态正确
    // 如果已选择城市，重新应用过滤（会重新处理收藏状态）
    if (this.data.selectedCityId) {
      this.applyFilter()
    }
    // 如果数据已加载，确保 loading 为 false
    if (this.data.cities.length > 0 && this.data.loading) {
      this.setData({ loading: false })
    }
  },
  async initData(): Promise<void> {
    try {
      // 从Supabase数据库加载城市列表
      const cities = await getCities()

      // 加载所有景点（用于搜索和筛选）
      const places = await searchPlaces({})

      console.log('加载数据成功:', { citiesCount: cities.length, placesCount: places.length })

      this.setData({
        cities,
        places,
        loading: false
      })

      this.updateHomeSummaries(cities, places)

      // 初始不显示景点，显示城市列表（除非有 cityId 参数，会在 onLoad 中处理）
    } catch (error: any) {
      console.error('加载数据失败:', error)
      const errorMsg = (error && error.message) || (error && error.errMsg) || '未知错误'
      console.error('错误详情:', {
        message: errorMsg,
        error: error
      })

      // 如果数据库加载失败，使用mock数据作为fallback
      wx.showToast({
        title: '数据加载失败，使用离线数据',
        icon: 'none',
        duration: 3000
      })

      // 输出详细错误信息到控制台
      console.warn('使用离线数据，错误原因:', errorMsg)

      const cities = this.mockCities()
      const places = this.mockPlaces()
      this.setData({
        cities,
        places,
        loading: false
      })

      this.updateHomeSummaries(cities, places)

    }
  },
  async onPullDownRefresh() {
    // 从Supabase数据库刷新数据
    try {
      const cities = await getCities()
      const places = await searchPlaces({})

      console.log('刷新数据成功:', { citiesCount: cities.length, placesCount: places.length })

      this.setData({
        cities,
        places
      })

      this.updateHomeSummaries(cities, places)

      // 刷新后重新应用过滤
      if (this.data.selectedCityId) {
        this.applyFilter()
      } else {
        this.setData({ filtered: [] })
      }
    } catch (error) {
      console.error('刷新数据失败:', error)
      wx.showToast({
        title: '刷新失败',
        icon: 'none',
        duration: 2000
      })
    } finally {
      wx.stopPullDownRefresh()
    }
  },
  chooseCity(e?: any) {
    // 如果点击了城市卡片，切换到该城市的景点列表
    if (e && e.currentTarget) {
      const dataset = e.currentTarget.dataset as any
      const cityImage = dataset.cityImage ? String(dataset.cityImage) : ''
      const cityDesc = dataset.cityDescription ? String(dataset.cityDescription) : ''
      let cityId = dataset.cityId ? String(dataset.cityId) : ''
      const cityName = dataset.cityName ? String(dataset.cityName) : ''
      let city = cityId ? this.data.cities.find(c => c.id === cityId) : undefined
      if (!city && cityName) {
        city = this.data.cities.find(c => c.name === cityName)
        if (city) {
          cityId = city.id
        }
      }
      const finalCityId = city ? city.id : (cityId || cityName)
      if (!finalCityId) {
        console.warn('chooseCity: city info missing', dataset)
        return
      }
      const activeCity = city
        ? this.normalizeCity(city)
        : {
            id: finalCityId,
            name: cityName || finalCityId,
            description: cityDesc || '',
            imageUrl: cityImage || this.data.cityHeroFallback
          }
        // 使用 navigateTo 跳转到同一页面但带上 cityId 参数
        // 这样页面栈中会有两页，原生返回按钮就会显示
        wx.navigateTo({
          url: `/pages/index/index?cityId=${finalCityId}`,
          success: () => {
            console.log('跳转到城市景点列表成功')
          },
          fail: (err) => {
            console.error('跳转失败，使用 setData 方式:', err)
            // 如果跳转失败，回退到原来的方式
            this.setData({
              selectedCityId: finalCityId,
              city: city ? city.name : (cityName || finalCityId),
              keyword: '',
              activeKeyword: '',
              selectedFilters: [],
              searchResults: [],
              searching: false,
              minRating: null,
              ratingPickerIndex: 0,
              selectedCategory: null,
              categoryPickerIndex: 0,
              showRatingDropdown: false,
              showCategoryDropdown: false,
              activeCity
            })
            wx.setNavigationBarTitle({
              title: activeCity.name + '景点'
            })
            this.applyFilter()
            setTimeout(() => {
              this.updateCategoryPicker()
            }, 100)
          }
        })
    } else {
      // 没有事件参数，可能是其他地方调用，返回城市列表
      this.backToCities()
    }
  },
  backToCities() {
    this.setData({
      selectedCityId: null,
      city: '杭州', // 重置为默认城市名
      keyword: '',
      activeKeyword: '',
      selectedFilters: [],
      minRating: null, // 重置评分筛选
      ratingPickerIndex: 0, // 重置评分 picker 索引
      selectedCategory: null, // 重置类型筛选
      categoryPickerIndex: 0, // 重置类型 picker 索引
      showRatingDropdown: false, // 关闭评分下拉菜单
      showCategoryDropdown: false, // 关闭类型下拉菜单
      filtered: [], // 清空过滤结果
      searchResults: [],
      searching: false,
      activeCity: null
    })
    // 恢复导航栏标题为首页
    wx.setNavigationBarTitle({
      title: '首页'
    })
  },
  onSearchInput(e: any) {
    const keyword = (e.detail.value as string) || ''
    const trimmed = keyword.trim()
    this.setData({ keyword, activeKeyword: trimmed })

    if (this.searchTimer) {
      clearTimeout(this.searchTimer)
      this.searchTimer = null
    }

    if (!trimmed) {
      this.setData({ searchResults: [], searching: false, activeKeyword: '' })
      if (this.data.selectedCityId) {
        this.applyFilter()
      }
      return
    }

    // 如果已选择城市，使用 applyFilter 搜索当前城市的景点
    // 如果未选择城市，使用 globalSearch 进行全局搜索
    if (this.data.selectedCityId) {
      this.searchTimer = setTimeout(() => {
        this.searchTimer = null
        this.applyFilter()
      }, 250) as unknown as number
    } else {
      this.searchTimer = setTimeout(() => {
        this.searchTimer = null
        this.globalSearch(trimmed)
      }, 250) as unknown as number
    }
  },
  clearSearch() {
    this.setData({ 
      keyword: '', 
      activeKeyword: '',
      showRatingDropdown: false, // 关闭评分下拉菜单
      showCategoryDropdown: false // 关闭类型下拉菜单
    })
    if (this.data.selectedCityId) {
      this.applyFilter()
    }
  },
  processPlaceForDisplay(place: any) {
    // 优先使用 AI 评分，如果没有则使用其他评分
    const aiScore = place.aiScoreTotal !== null && place.aiScoreTotal !== undefined 
      ? place.aiScoreTotal 
      : null
    const score = aiScore !== null ? aiScore : (place.rating || place.score || 0)
    
    // 基于评分计算显示数据
    const accessibilityIcons = this.getAccessibilityIcons(score)
    const starRating = this.getStarRating(score)
    
    // 获取收藏状态
    const bookmarkedPlaces = wx.getStorageSync('bookmarkedPlaces') || []
    const isBookmarked = bookmarkedPlaces.includes(place.id)
    
    // 获取badge信息（使用和详情页相同的逻辑）
    const summaryPrefix = this.getSummaryPrefix(aiScore !== null ? aiScore : score)
    const badgeColor = this.getSummaryBadgeColor(aiScore !== null ? aiScore : score)
    
    return {
      ...place,
      // 确保使用 AI 评分作为主要评分
      rating: aiScore !== null ? aiScore : (place.rating || place.score || 0),
      score: aiScore !== null ? aiScore : (place.rating || place.score || 0),
      // 保留原始 aiScoreTotal 字段，用于显示
      aiScoreTotal: place.aiScoreTotal !== null && place.aiScoreTotal !== undefined ? place.aiScoreTotal : null,
      // 新的badge系统
      summaryPrefix,
      badgeColor,
      accessibilityIcons: accessibilityIcons || [], // 确保始终是数组，防止undefined错误
      starRating,
      isBookmarked
    }
  },
  // 根据评分生成badge文本（和详情页保持一致）
  getSummaryPrefix(score: number | null | undefined): string {
    const rating = score || 0
    if (rating >= 4.5) {
      return '轮椅非常友好'
    } else if (rating >= 4.0) {
      return '轮椅基本可行'
    } else if (rating >= 3.0) {
      return '轮椅部分可行'
    } else if (rating >= 2.0) {
      return '不建议轮椅直接通行'
    } else {
      return '不推荐轮椅前往'
    }
  },
  // 根据评分获取badge颜色（和详情页保持一致）
  getSummaryBadgeColor(score: number | null | undefined): { color: string; bgColor: string } {
    const rating = score || 0
    if (rating >= 4.5) {
      // 绿色：友好、可行，表示无障碍程度优秀（背景色带透明度，更清爽）
      return { color: '#059669', bgColor: 'rgba(209, 250, 229, 0.3)' } // emerald-100 with 30% opacity
    } else if (rating >= 4.0) {
      // 蓝色：专业、可信赖，表示无障碍程度良好（背景色带透明度，更清爽）
      return { color: '#0284C7', bgColor: 'rgba(224, 242, 254, 0.3)' } // sky-100 with 30% opacity
    } else if (rating >= 3.0) {
      // 黄色：需要注意，表示部分可行（背景色带透明度，更清爽）
      return { color: '#CA8A04', bgColor: 'rgba(254, 249, 195, 0.3)' } // yellow-100 with 30% opacity
    } else if (rating >= 2.0) {
      // 橙色：不太友好，表示通行较困难（背景色带透明度，更清爽）
      return { color: '#C2410C', bgColor: 'rgba(255, 228, 204, 0.3)' } // orange-100 with 30% opacity
    } else {
      // 红色：不推荐，表示不适合轮椅通行（背景色带透明度，更清爽）
      return { color: '#B91C1C', bgColor: 'rgba(254, 226, 226, 0.3)' } // red-100 with 30% opacity
    }
  },
  getAccessibilityIcons(score: number) {
    // 将评分转换为0-5的范围（假设评分是0-5分制）
    // 如果评分是0-100分制，需要转换
    let normalizedScore = score
    if (score > 5) {
      // 如果是100分制，转换为5分制
      normalizedScore = (score / 100) * 5
    }
    
    // 确保在0-5范围内
    normalizedScore = Math.max(0, Math.min(5, normalizedScore))
    
    // 计算整数部分和小数部分
    const fullCount = Math.floor(normalizedScore)
    const hasHalf = normalizedScore % 1 >= 0.5
    
    // 返回每个图标的状态：'full'（完全激活）、'half'（半激活）、'empty'（不激活）
    // 为每个对象添加唯一的 index 属性，用于 wx:key
    return Array.from({ length: 5 }, (_, i) => {
      if (i < fullCount) {
        return { state: 'full', index: i }
      } else if (i === fullCount && hasHalf) {
        return { state: 'half', index: i }
      } else {
        return { state: 'empty', index: i }
      }
    })
  },
  getStarRating(rating: number) {
    // 将评分转换为星级显示（如 4.5 -> ★★★★☆）
    // 处理无效值：NaN、负数、过大值
    if (!rating || isNaN(rating) || rating < 0) {
      rating = 0
    }
    if (rating > 5) {
      rating = 5
    }
    
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
    
    // 确保 repeat 的参数是有效的非负整数
    const safeFullStars = Math.max(0, Math.min(5, fullStars))
    const safeEmptyStars = Math.max(0, Math.min(5, emptyStars))
    
    return '★'.repeat(safeFullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(safeEmptyStars)
  },
  toggleBookmark(e: any) {
    const placeId = String((e.currentTarget.dataset as any).id || '')
    const index = Number((e.currentTarget.dataset as any).index || 0)
    
    if (!placeId) return
    
    // 获取当前收藏列表
    let bookmarkedPlaces = wx.getStorageSync('bookmarkedPlaces') || []
    const isBookmarked = bookmarkedPlaces.includes(placeId)
    
    // 切换收藏状态
    if (isBookmarked) {
      bookmarkedPlaces = bookmarkedPlaces.filter((id: string) => id !== placeId)
      wx.showToast({
        title: '已取消收藏',
        icon: 'none',
        duration: 1500
      })
    } else {
      bookmarkedPlaces.push(placeId)
      wx.showToast({
        title: '已收藏',
        icon: 'none',
        duration: 1500
      })
    }
    
    // 保存到本地存储
    wx.setStorageSync('bookmarkedPlaces', bookmarkedPlaces)
    
    // 更新当前列表中的收藏状态
    const filtered = [...this.data.filtered]
    if (filtered[index]) {
      filtered[index].isBookmarked = !isBookmarked
      this.setData({ filtered })
    }
  },
  toggleFilter(e: any) {
    // 只有在已选择城市时才能筛选
    if (!this.data.selectedCityId) {
      console.warn('toggleFilter: no city selected')
      return
    }
    const tag = String((e.currentTarget.dataset as any).tag || '')
    if (!tag) {
      console.warn('toggleFilter: tag is empty')
      return
    }
    const set = new Set(this.data.selectedFilters)
    set.has(tag) ? set.delete(tag) : set.add(tag)
    this.setData({ selectedFilters: Array.from(set) })
    this.applyFilter()
  },
  async applyFilter() {
    if (!this.data.selectedCityId) {
      // 如果未选择城市，不显示景点
      this.setData({ filtered: [] })
      return
    }

    try {
      // 从Supabase数据库查询景点
      const keyword = (this.data.keyword || '').trim()
      const filters = this.data.selectedFilters

      const places = await searchPlaces({
        cityId: this.data.selectedCityId,
        keyword: keyword || undefined,
        filters: filters.length > 0 ? filters : undefined,
        selectedCityId: this.data.selectedCityId
      })

      console.log('筛选景点成功:', { count: places.length, cityId: this.data.selectedCityId })

      // 应用评分和类型筛选
      let result = places
      
      // 按最低评分筛选
      if (this.data.minRating !== null) {
        result = result.filter(p => {
          const score = p.aiScoreTotal || p.rating || p.score || 0
          return score >= this.data.minRating!
        })
      }
      
      // 按类型筛选
      if (this.data.selectedCategory) {
        result = result.filter(p => p.category === this.data.selectedCategory)
      }
      
      // 按无障碍评分从高到低排序
      result = [...result].sort((a, b) => {
        const scoreA = a.aiScoreTotal || a.rating || a.score || 0
        const scoreB = b.aiScoreTotal || b.rating || b.score || 0
        return scoreB - scoreA // 从高到低
      })
      
      // 处理无障碍评分显示数据
      const processedResult = result.map(place => this.processPlaceForDisplay(place))
      
      this.setData({ filtered: processedResult })
      
      // 更新 picker 数据源
      this.updateCategoryPicker()
    } catch (error) {
      console.error('筛选景点失败:', error)
      // 如果数据库查询失败，使用本地数据作为fallback
      if (!this.data.places || this.data.places.length === 0) {
        console.warn('applyFilter: places not loaded yet')
        return
      }

      const keyword = (this.data.keyword || '').trim()
      const filters = new Set(this.data.selectedFilters)
      let list = this.data.places.filter(p => {
        const cityMatch = p.cityId === this.data.selectedCityId
        if (!cityMatch) return false

        const hitKeyword = !keyword ||
          p.name.includes(keyword) ||
          (p.description && p.description.includes(keyword)) ||
          (p.tags && p.tags.some(t => t.includes(keyword)))

        const hitFilters = filters.size === 0 ||
          (p.tags && Array.from(filters).every(f => p.tags && p.tags.includes(f)))

        return hitKeyword && hitFilters
      })
      
      // 按最低评分筛选
      if (this.data.minRating !== null) {
        list = list.filter(p => {
          const score = p.aiScoreTotal || p.rating || p.score || 0
          return score >= this.data.minRating!
        })
      }
      
      // 应用类型筛选
      if (this.data.selectedCategory) {
        list = list.filter(p => p.category === this.data.selectedCategory)
      }
      
      // 按无障碍评分从高到低排序
      list = [...list].sort((a, b) => {
        const scoreA = a.aiScoreTotal || a.rating || a.score || 0
        const scoreB = b.aiScoreTotal || b.rating || b.score || 0
        return scoreB - scoreA // 从高到低
      })
      
      // 处理无障碍评分显示数据
      const processedList = list.map(place => this.processPlaceForDisplay(place))
      
      this.setData({ filtered: processedList })
      
      // 更新 picker 数据源
      this.updateCategoryPicker()
    }
  },
  onRatingPickerChange(e: any) {
    const index = e.detail.value
    const ratingOptions = this.data.ratingPickerRange
    
    let selectedRating: number | null = null
    if (index === 0) {
      selectedRating = null // 全部
    } else if (index === 1) {
      selectedRating = 5 // 5分（仅5分）
    } else if (index === 2) {
      selectedRating = 4 // 4分+（4分及以上）
    } else if (index === 3) {
      selectedRating = 3 // 3分+（3分及以上）
    }
    
    this.setData({ 
      minRating: selectedRating,
      ratingPickerIndex: index
    })
    this.applyFilter()
  },
  toggleRatingDropdown() {
    this.setData({
      showRatingDropdown: !this.data.showRatingDropdown,
      showCategoryDropdown: false // 关闭另一个下拉菜单
    })
  },
  toggleCategoryDropdown() {
    this.setData({
      showCategoryDropdown: !this.data.showCategoryDropdown,
      showRatingDropdown: false // 关闭另一个下拉菜单
    })
  },
  selectRating(e: any) {
    const value = e.currentTarget.dataset.value
    // 空字符串或 undefined 表示全部（null）
    const rating = (value === '' || value === null || value === undefined) ? null : Number(value)
    
    // 更新 picker 索引
    let index = 0
    if (rating === 5) index = 1
    else if (rating === 4) index = 2
    else if (rating === 3) index = 3
    
    this.setData({
      minRating: rating,
      ratingPickerIndex: index,
      showRatingDropdown: false
    })
    this.applyFilter()
  },
  selectCategory(e: any) {
    const value = e.currentTarget.dataset.value
    // 空字符串或 undefined 表示全部（null）
    const categoryValue = (value === '' || value === null || value === undefined) ? null : value
    
    // 找到对应的索引
    const pickerRange = this.data.categoryPickerRange
    const index = pickerRange.findIndex(item => item.value === categoryValue)
    
    this.setData({
      selectedCategory: categoryValue,
      categoryPickerIndex: index >= 0 ? index : 0,
      showCategoryDropdown: false
    })
    this.applyFilter()
  },
  closeAllDropdowns() {
    this.setData({
      showRatingDropdown: false,
      showCategoryDropdown: false
    })
  },
  async updateCategoryPicker() {
    // 更新 picker 组件的数据源
    if (!this.data.selectedCityId) {
      this.setData({
        categoryPickerRange: [],
        categoryPickerIndex: 0
      })
      return
    }
    
    try {
      // 先尝试从本地数据获取类型
      let categories = this.getLocalCategories()
      
      // 如果本地数据没有，从数据库查询
      if (categories.length === 0) {
        categories = await this.getAvailableCategories()
      }
      
      // 构建 picker 数据源
      const pickerRange = [{ label: '全部', value: null }].concat(
        categories.map(cat => ({ label: cat, value: cat }))
      )
      
      // 找到当前选中项的索引
      let currentIndex = 0
      if (this.data.selectedCategory) {
        const index = pickerRange.findIndex(item => item.value === this.data.selectedCategory)
        if (index >= 0) {
          currentIndex = index
        }
      }
      
      this.setData({
        categoryPickerRange: pickerRange,
        categoryPickerIndex: currentIndex
      })
    } catch (error) {
      console.error('updateCategoryPicker error:', error)
    }
  },
  onCategoryPickerChange(e: any) {
    const index = e.detail.value
    const pickerRange = this.data.categoryPickerRange
    
    if (index >= 0 && index < pickerRange.length) {
      const selected = pickerRange[index]
      console.log('用户选择了类型:', selected)
      this.setData({
        selectedCategory: selected.value,
        categoryPickerIndex: index
      })
      this.applyFilter()
    }
  },
  getLocalCategories(): string[] {
    // 从本地数据获取类型
    if (!this.data.selectedCityId) {
      return []
    }
    
    const sourceList = this.data.filtered.length > 0 
      ? this.data.filtered 
      : this.data.places.filter(p => p.cityId === this.data.selectedCityId)
    
    const categories = new Set<string>()
    sourceList.forEach(place => {
      if (place.category && place.category.trim()) {
        categories.add(place.category.trim())
      }
    })
    
    return Array.from(categories).sort()
  },
  async getAvailableCategories(): Promise<string[]> {
    // 从当前城市的景点中获取所有可用的类型
    if (!this.data.selectedCityId) {
      return []
    }
    
    try {
      // 从数据库查询当前城市的所有景点，获取类型
      const allPlaces = await searchPlaces({
        cityId: this.data.selectedCityId,
        selectedCityId: this.data.selectedCityId
      })
      
      const categories = new Set<string>()
      allPlaces.forEach(place => {
        if (place.category && place.category.trim()) {
          categories.add(place.category.trim())
        }
      })
      
      return Array.from(categories).sort()
    } catch (error) {
      console.error('getAvailableCategories error:', error)
      // 如果数据库查询失败，尝试从本地数据获取
      const sourceList = this.data.filtered.length > 0 
        ? this.data.filtered 
        : this.data.places.filter(p => p.cityId === this.data.selectedCityId)
      
      const categories = new Set<string>()
      sourceList.forEach(place => {
        if (place.category && place.category.trim()) {
          categories.add(place.category.trim())
        }
      })
      
      return Array.from(categories).sort()
    }
  },
  async globalSearch(keyword: string) {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) {
      this.setData({ searchResults: [], searching: false })
      return
    }

    this.setData({ searching: true, searchResults: [] })

    try {
      const cityResults = (this.data.cities || []).filter(city => {
        const nameMatch = (city.name && city.name.toLowerCase().includes(normalized))
        const descMatch = (city.description && city.description.toLowerCase().includes(normalized))
        return nameMatch || descMatch
      }).map(city => ({
        key: `city-${city.id}`,
        type: 'city' as const,
        id: city.id,
        name: city.name,
        subtitle: `${city.attractionCount || 0} 个无障碍景点`,
        image: city.imageUrl,
        cityId: city.id
      }))

      const placeResults = (this.data.places || []).filter(place => {
        const nameMatch = (place.name && place.name.toLowerCase().includes(normalized))
        const descMatch = (place.description && place.description.toLowerCase().includes(normalized))
        const tagMatch = Array.isArray(place.tags) && place.tags.some(tag => String(tag || '').toLowerCase().includes(normalized))
        return nameMatch || descMatch || tagMatch
      }).map(place => {
        const cityName = this.getCityNameById(place.cityId || '')
        const subtitleParts: string[] = []
        if (cityName) subtitleParts.push(cityName)
        if (place.category) subtitleParts.push(place.category)

        return {
          key: `place-${place.id}`,
          type: 'place' as const,
          id: place.id,
          name: place.name,
          subtitle: subtitleParts.join(' · '),
          image: place.imageUrl || place.cover,
          cityId: place.cityId,
          rating: place.rating || place.score || 0
        }
      })

      const combined = [...cityResults, ...placeResults].slice(0, 20)

      this.setData({
        searchResults: combined,
        searching: false
      })
    } catch (error) {
      console.error('globalSearch error:', error)
      this.setData({ searching: false })
    }
  },
  getCityNameById(cityId: string | undefined | null) {
    if (!cityId) return ''
    const city = this.data.cities.find(c => c.id === cityId)
    return city ? city.name : ''
  },
  switchTab(e: any) {
    const tab = String((e.currentTarget.dataset as any).tab || 'explore')
    if (tab === 'profile') {
      // 切换到"我的"页面
      wx.redirectTo({ url: '/pages/profile/index' })
    } else {
      // 如果已经在探索页面，不需要切换
      this.setData({ activeTab: 'explore' })
    }
  },
  goDetail(e: any) {
    // 防抖处理：如果正在跳转，忽略新的点击
    if (this._navigating) {
      return
    }
    this._navigating = true

    const dataset = (e.currentTarget && e.currentTarget.dataset) || {}
    const id = String(dataset.id || '')
    
    if (!id) {
      console.warn('goDetail: id is empty')
      this._navigating = false
      wx.showToast({
        title: '景点信息缺失',
        icon: 'none',
        duration: 2000
      })
      return
    }

    // 优先使用 dataset 中的数据，避免查找操作
    const cityId = dataset.cityId ? String(dataset.cityId) : (this.data.selectedCityId || '')
    const name = dataset.name ? String(dataset.name) : ''
    const image = dataset.image ? String(dataset.image) : ''
    const rating = dataset.rating !== undefined ? Number(dataset.rating) : 0
    const description = dataset.description ? String(dataset.description) : ''
    const summary = dataset.summary ? String(dataset.summary) : ''

    // 立即跳转，不等待数据查找
    this.navigateToDetail({ id, cityId, name, image, rating, description, summary })
  },
  navigateToDetail(params: { id: string; cityId?: string; name?: string; image?: string; rating?: number | string; description?: string; summary?: string }) {
    const { id, cityId, name, image, rating, description, summary } = params
    if (!id) {
      this._navigating = false
      return
    }

    // 快速构建 URL，只包含必要参数
    let url = `/pages/place-detail/index?id=${id}`
    if (cityId) url += `&cityId=${cityId}`
    if (name) url += `&name=${encodeURIComponent(name)}`
    if (image) url += `&image=${encodeURIComponent(image)}`
    if (rating !== undefined && rating !== null && rating !== '') {
      const numericRating = Number(rating)
      if (!Number.isNaN(numericRating) && numericRating > 0) {
        url += `&rating=${numericRating}`
      }
    }
    if (description) url += `&description=${encodeURIComponent(description)}`
    if (summary) url += `&summary=${encodeURIComponent(summary)}`

    // 立即跳转，不等待
    wx.navigateTo({
      url,
      success: () => {
        console.log('navigateTo success')
        // 延迟重置，确保页面跳转完成
        setTimeout(() => {
          this._navigating = false
        }, 500)
      },
      fail: (err) => {
        console.error('goDetail: navigateTo failed', err)
        this._navigating = false
        wx.showToast({
          title: '打开详情页失败',
          icon: 'none',
          duration: 2000
        })
        // 尝试使用 redirectTo 作为备选
        wx.redirectTo({
          url,
          fail: (err2) => {
            console.error('redirectTo also failed', err2)
          }
        })
      }
    })
  },
  onSearchResultTap(e: any) {
    const dataset = e.currentTarget ? (e.currentTarget.dataset as any) : {}
    const type = String(dataset.type || '')
    const id = String(dataset.id || '')

    if (!type || !id) {
      console.warn('onSearchResultTap: invalid dataset', dataset)
      return
    }

    if (type === 'city') {
      const city = this.data.cities.find(c => c.id === id)
      if (!city) {
        wx.showToast({ title: '未找到相关城市', icon: 'none' })
        return
      }
      this.setData({
        selectedCityId: city.id,
        city: city.name,
        keyword: '',
        activeKeyword: '',
        selectedFilters: [],
        searchResults: [],
        searching: false,
        minRating: null,
        ratingPickerIndex: 0,
        selectedCategory: null,
        categoryPickerIndex: 0,
        showRatingDropdown: false, // 关闭评分下拉菜单
        showCategoryDropdown: false, // 关闭类型下拉菜单
        activeCity: this.normalizeCity(city)
      })
      this.applyFilter()
      return
    }

    const place = this.data.places.find(p => p.id === id)
    const datasetCityId = dataset.cityId ? String(dataset.cityId) : ''
    const finalCityId = datasetCityId || (place && place.cityId) || ''
    const finalName = dataset.name ? String(dataset.name) : ((place && place.name) || '')
    const finalImage = dataset.image ? String(dataset.image) : ((place && place.imageUrl) || (place && place.cover) || '')
    const finalRating = dataset.rating !== undefined ? Number(dataset.rating) : ((place && place.rating) || (place && place.score) || 0)

    const updates: any = {
      keyword: '',
      activeKeyword: '',
      searchResults: [],
      searching: false
    }

    if (finalCityId) {
      updates.selectedCityId = finalCityId
      const cityName = this.getCityNameById(finalCityId)
      if (cityName) {
        updates.city = cityName
      }
      const city = this.data.cities.find(c => c.id === finalCityId)
      updates.activeCity = city ? this.normalizeCity(city) : null
      updates.selectedFilters = []
      updates.minRating = null
      updates.ratingPickerIndex = 0
      updates.selectedCategory = null
      updates.categoryPickerIndex = 0
    }

    this.setData(updates)

    if (finalCityId) {
      this.applyFilter()
    }

    this.navigateToDetail({
      id,
      cityId: finalCityId,
      name: finalName,
      image: finalImage,
      rating: finalRating
    })
  },
  updateHomeSummaries(cities: Array<any>, places: Array<any>) {
    const summaries = this.buildCitySummaries(cities, places)
    const stats = this.buildGlobalStats(cities, places, summaries)
    const featuredCities = this.buildFeaturedCities(cities)

    this.setData({
      citySummaries: summaries,
      globalStats: stats,
      featuredCities
    })
    this.syncActiveCity()
  },
  buildCitySummaries(cities: Array<any>, places: Array<any>) {
    const placeMap = new Map<string, any[]>()
    ;(places || []).forEach(place => {
      const cityId = place.cityId || place.city_id
      if (!cityId) return
      if (!placeMap.has(cityId)) {
        placeMap.set(cityId, [])
      }
      placeMap.get(cityId)!.push(place)
    })

    return (cities || []).map(city => {
      const cityPlaces = placeMap.get(city.id) || []
      const total = (city.attractionCount != null) ? city.attractionCount : cityPlaces.length
      const normalizedTotal = total && total > 0 ? total : cityPlaces.length
      const fullyAccessible = cityPlaces.filter(place => {
        const level = String(place.accessibilityLevel || place.accessibility_label || '').toLowerCase()
        if (level.includes('excellent') || level.includes('优秀')) {
          return true
        }
        // 优先使用 accessibilityScore (100分制)，如果没有则使用 rating (5分制) * 20
        const score = Number(place.accessibilityScore || (place.rating ? place.rating * 20 : 0) || (place.score ? place.score * 20 : 0))
        return !Number.isNaN(score) && score >= 90
      }).length

      const region = city.region || city.province || city.description || ''

      const badge = this.deriveTrendBadge(normalizedTotal, fullyAccessible)
      const totalDelta = this.estimateMetricDelta(normalizedTotal)
      const accessibleDelta = this.estimateMetricDelta(fullyAccessible, true)

      return {
        id: city.id,
        name: city.name,
        region,
        total: normalizedTotal,
        fullyAccessible,
        totalDelta,
        accessibleDelta,
        trendLabel: badge.label,
        trendTone: badge.tone
      }
    }).sort((a, b) => (b.total || 0) - (a.total || 0))
  },
  buildGlobalStats(cities: Array<any>, places: Array<any>, summaries: Array<{ total: number }>) {
    const uniqueCityCount = (cities || []).length || (summaries || []).length
    const placeCount = (places || []).length || (summaries || []).reduce((sum, item) => sum + (item.total || 0), 0)
    const sourceCount = Math.max(Math.round(placeCount * 1.5), 10)

    return {
      cityCount: uniqueCityCount,
      placeCount,
      sourceCount
    }
  },
  deriveTrendBadge(total: number, fullyAccessible: number) {
    if (!total) {
      return { label: '待补充', tone: 'neutral' as const }
    }
    const ratio = fullyAccessible / total
    if (ratio >= 0.6) {
      return { label: '体验佳', tone: 'positive' as const }
    }
    if (ratio >= 0.3) {
      return { label: '持续改善', tone: 'warning' as const }
    }
    return { label: '待补充', tone: 'neutral' as const }
  },
  estimateMetricDelta(value: number, biasUp?: boolean) {
    if (!value || Number.isNaN(value)) {
      return 0
    }
    const baseline = Math.max(1, Math.round(value * (biasUp ? 0.15 : 0.12)))
    return baseline
  },
  buildFeaturedCities(cities: Array<any>) {
    const preferredOrder = ['北京', '上海', '广州', '深圳', '武汉', '三亚']
    const imageMap: Record<string, string> = {
      北京: 'https://images.unsplash.com/photo-1523413650179-4b23b8c7c3b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      上海: 'https://images.unsplash.com/photo-1523059623039-a9ed027e7fad?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      广州: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      深圳: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      武汉: 'https://images.unsplash.com/photo-1591604466377-1a63d39d0a0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
      三亚: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'
    }
    const cityMap = new Map<string, any>()
    ;(cities || []).forEach(city => {
      if (city && city.name) {
        cityMap.set(String(city.name), city)
      }
    })
    return preferredOrder.map(name => {
      const city = cityMap.get(name)
      if (city) {
        return {
          id: city.id,
          name: city.name,
          imageUrl: city.imageUrl || city.cover || imageMap[name] || this.data.cityHeroFallback,
          description: city.description || city.region || ''
        }
      }
      return {
        id: name,
        name,
        imageUrl: imageMap[name] || this.data.cityHeroFallback,
        description: '敬请期待更多真实体验'
      }
    })
  },
  normalizeCity(city: any) {
    if (!city) return null
    return {
      id: city.id,
      name: city.name,
      description: city.description || city.region || city.subtitle || '',
      imageUrl: city.imageUrl || city.cover || city.banner || ''
    }
  },
  syncActiveCity(cityId?: string) {
    const id = cityId || this.data.selectedCityId
    if (!id) {
      if (this.data.activeCity) {
        this.setData({ activeCity: null })
      }
      return
    }
    const city = this.data.cities.find(c => c.id === id)
    if (city) {
      const normalized = this.normalizeCity(city)
      if (normalized) {
        this.setData({ activeCity: normalized })
      }
    }
  },
  mockCities() {
    return [
      {
        id: 'hangzhou',
        name: '杭州',
        description: '西湖美景，无障碍天堂',
        region: '浙江省',
        imageUrl: 'https://images.unsplash.com/photo-1726703062028-e43d2eec8080?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        attractionCount: 8
      },
      {
        id: 'shanghai',
        name: '上海',
        description: '国际都市，设施完善',
        region: '上海市',
        imageUrl: 'https://images.unsplash.com/photo-1647066501166-54b17d88e61b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        attractionCount: 12
      },
      {
        id: 'beijing',
        name: '北京',
        description: '古都文化，无障碍之旅',
        region: '北京市',
        imageUrl: 'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        attractionCount: 15
      },
      {
        id: 'suzhou',
        name: '苏州',
        description: '园林之城，轻松游览',
        region: '江苏省',
        imageUrl: 'https://images.unsplash.com/photo-1689825650048-55d2216868f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        attractionCount: 6
      },
      {
        id: 'wuhan',
        name: '武汉',
        description: '江城武汉，无障碍设施完善',
        region: '湖北省',
        imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        attractionCount: 10
      }
    ]
  },
  mockPlaces() {
    return [
      {
        id: 'p1',
        cityId: 'hangzhou',
        name: '西湖公园',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        category: '公园',
        accessibilityScore: 98,
        accessibilityLevel: 'excellent',
        accessibilityLabel: '优秀',
        distance: '1.2km',
        duration: '2-3小时',
        description: '全程无障碍步道，沿途配备多处休息站和无障碍卫生间，轮椅可轻松游览。',
        hasAccessibleRestroom: true,
        hasElevator: false,
        hasParking: true,
        tags: ['平路多', '有卫生间', '停车近']
      },
      {
        id: 'p2',
        cityId: 'hangzhou',
        name: '雷峰塔',
        rating: 4.7,
        imageUrl: 'https://images.unsplash.com/photo-1638888197213-2c0f0b4d0b8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        category: '景点',
        accessibilityScore: 85,
        accessibilityLevel: 'good',
        accessibilityLabel: '良好',
        distance: '2.5km',
        duration: '1-2小时',
        description: '配备无障碍电梯，可直达塔顶观景，轮椅友好。',
        hasAccessibleRestroom: true,
        hasElevator: true,
        hasParking: true,
        tags: ['有电梯', '有卫生间']
      },
      {
        id: 'p3',
        cityId: 'hangzhou',
        name: '灵隐寺',
        rating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        category: '寺庙',
        accessibilityScore: 72,
        accessibilityLevel: 'moderate',
        accessibilityLabel: '一般',
        distance: '3.8km',
        duration: '2小时',
        description: '部分区域有台阶，但主要大殿可通过坡道进入。',
        hasAccessibleRestroom: true,
        hasElevator: false,
        hasParking: true,
        tags: ['平路多', '有卫生间']
      },
      {
        id: 'w1',
        cityId: 'wuhan',
        name: '东湖绿道',
        rating: 4.9,
        imageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        category: '公园',
        accessibilityScore: 95,
        accessibilityLevel: 'excellent',
        accessibilityLabel: '优秀',
        distance: '0.8km',
        duration: '2-3小时',
        description: '全长约30公里，全程无障碍步道，坡度平缓，非常适合轮椅用户游览。沿途配备多处无障碍卫生间和休息站。',
        hasAccessibleRestroom: true,
        hasElevator: false,
        hasParking: true,
        tags: ['平路多', '有卫生间', '停车近']
      },
      {
        id: 'w2',
        cityId: 'wuhan',
        name: '黄鹤楼',
        rating: 4.7,
        imageUrl: 'https://images.unsplash.com/photo-1591604466377-1a63d39d0a0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        category: '景点',
        accessibilityScore: 88,
        accessibilityLevel: 'good',
        accessibilityLabel: '良好',
        distance: '1.5km',
        duration: '1-2小时',
        description: '配备无障碍电梯，可直达主楼观景台。入口处有无障碍通道，轮椅可轻松进入。',
        hasAccessibleRestroom: true,
        hasElevator: true,
        hasParking: true,
        tags: ['有电梯', '有卫生间', '停车近']
      },
      {
        id: 'w3',
        cityId: 'wuhan',
        name: '武汉大学',
        rating: 4.8,
        imageUrl: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        category: '校园',
        accessibilityScore: 82,
        accessibilityLevel: 'good',
        accessibilityLabel: '良好',
        distance: '2.3km',
        duration: '2-3小时',
        description: '樱花大道全程无障碍，主要教学楼配备无障碍电梯。校园内有多处无障碍卫生间。',
        hasAccessibleRestroom: true,
        hasElevator: true,
        hasParking: true,
        tags: ['平路多', '有电梯', '有卫生间']
      },
      {
        id: 'w4',
        cityId: 'wuhan',
        name: '户部巷',
        rating: 4.6,
        imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        category: '美食街',
        accessibilityScore: 75,
        accessibilityLevel: 'moderate',
        accessibilityLabel: '一般',
        distance: '1.2km',
        duration: '1-2小时',
        description: '主要街道无障碍，但部分店铺有台阶。推荐在入口区域用餐，轮椅可通行。',
        hasAccessibleRestroom: true,
        hasElevator: false,
        hasParking: false,
        tags: ['平路多', '有卫生间']
      }
    ]
  }
})
