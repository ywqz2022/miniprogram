// app.ts
App<IAppOption>({
  globalData: {
    userInfo: null as WechatMiniprogram.UserInfo | null,
    userId: '' // 用户ID，用于Supabase
  },
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录获取用户标识
    wx.login({
      success: (res) => {
        console.log('登录code:', res.code)
        // 生成或获取用户ID
        const userId = wx.getStorageSync('userId') || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        wx.setStorageSync('userId', userId)
        this.globalData.userId = userId
        console.log('userId:', userId)
      },
    })
  },
})