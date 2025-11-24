-- Supabase数据库初始化SQL脚本
-- 在Supabase控制台的SQL Editor中执行此脚本

-- ============================================
-- 1. 创建城市表
-- ============================================
CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  attraction_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);

-- ============================================
-- 2. 创建景点表
-- ============================================
CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  city_id TEXT REFERENCES cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rating DECIMAL(3,1),
  score DECIMAL(3,1),
  category TEXT,
  accessibility_score INTEGER,
  accessibility_level TEXT,
  accessibility_label TEXT,
  distance TEXT,
  duration TEXT,
  description TEXT,
  intro TEXT,
  tags TEXT[],
  has_accessible_restroom BOOLEAN DEFAULT FALSE,
  has_elevator BOOLEAN DEFAULT FALSE,
  has_parking BOOLEAN DEFAULT FALSE,
  location TEXT,
  surface_condition TEXT,
  step_condition TEXT,
  terrain_notes TEXT,
  image_url TEXT,
  images TEXT[],
  phone TEXT,
  email TEXT,
  hours TEXT,
  address TEXT,
  website TEXT,
  detailed_info JSONB,
  raw_notes_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_places_city_id ON places(city_id);
CREATE INDEX IF NOT EXISTS idx_places_accessibility_score ON places(accessibility_score DESC);
CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);

-- ============================================
-- 3. 创建评价表
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
  place_name TEXT,
  user_id TEXT,
  rating DECIMAL(3,1) NOT NULL,
  surface_condition TEXT,
  step_condition TEXT,
  needs_assistance BOOLEAN,
  recommendation TEXT,
  facilities JSONB,
  content TEXT,
  images TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================
-- 4. 创建收藏表
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  place_id TEXT REFERENCES places(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_place_id ON favorites(place_id);

-- ============================================
-- 5. 启用行级安全策略（RLS）
-- ============================================

-- 城市表：允许所有人读取
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "任何人都可以读取城市" ON cities;
CREATE POLICY "任何人都可以读取城市"
  ON cities FOR SELECT
  USING (true);

-- 景点表：允许所有人读取
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "任何人都可以读取景点" ON places;
CREATE POLICY "任何人都可以读取景点"
  ON places FOR SELECT
  USING (true);

-- 评价表：允许所有人读取， anyone可以创建
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "任何人都可以读取评价" ON reviews;
CREATE POLICY "任何人都可以读取评价"
  ON reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "任何人都可以创建评价" ON reviews;
CREATE POLICY "任何人都可以创建评价"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- 收藏表：允许所有人查看和创建
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "用户可以查看自己的收藏" ON favorites;
CREATE POLICY "用户可以查看自己的收藏"
  ON favorites FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "用户可以创建自己的收藏" ON favorites;
CREATE POLICY "用户可以创建自己的收藏"
  ON favorites FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "用户可以删除自己的收藏" ON favorites;
CREATE POLICY "用户可以删除自己的收藏"
  ON favorites FOR DELETE
  USING (true);

-- ============================================
-- 6. 插入初始城市数据
-- ============================================
INSERT INTO cities (id, name, description, image_url, attraction_count) VALUES
('hangzhou', '杭州', '西湖美景，无障碍天堂', 'https://images.unsplash.com/photo-1726703062028-e43d2eec8080?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 8),
('shanghai', '上海', '国际都市，设施完善', 'https://images.unsplash.com/photo-1647066501166-54b17d88e61b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 12),
('beijing', '北京', '古都文化，无障碍之旅', 'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 15),
('suzhou', '苏州', '园林之城，轻松游览', 'https://images.unsplash.com/photo-1689825650048-55d2216868f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 6),
('wuhan', '武汉', '江城武汉，无障碍设施完善', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080', 10)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 7. 插入初始景点数据
-- ============================================

-- 杭州景点
INSERT INTO places (
  id, city_id, name, rating, score, category, accessibility_score, accessibility_level, accessibility_label,
  distance, duration, description, intro, tags, has_accessible_restroom, has_elevator, has_parking,
  location, surface_condition, step_condition, terrain_notes, image_url, images, phone, email, hours, address, website, detailed_info
) VALUES
(
  'p1', 'hangzhou', '西湖公园', 4.9, 4.9, '公园', 98, 'excellent', '优秀',
  '1.2km', '2-3小时', '全程无障碍步道，沿途配备多处休息站和无障碍卫生间，轮椅可轻松游览。', '全程无障碍步道，沿途配备多处休息站和无障碍卫生间，轮椅可轻松游览。',
  ARRAY['平路多', '有卫生间', '停车近'], true, false, true,
  '杭州市西湖区', 'excellent', 'none', '路面很平整，推轮椅非常轻松，全程无台阶',
  'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://picsum.photos/seed/b/800/400',
    'https://picsum.photos/seed/c/800/400'
  ],
  '+86 571 8796 6666', 'info@westlake.com', '全天开放', '浙江省杭州市西湖区龙井路1号', 'www.westlake.com',
  '{"terrain": "环湖步道路面非常平整，铺设了防滑材料，推轮椅很轻松。全程无台阶，有几处缓坡但坡度很小，轮椅可以自己推上去。", "entrances": "景区主入口设有平缓坡道，轮椅可直接进入，自动门全天开放。", "parking": "北门和南门均设有无障碍停车位共20个，免费使用。", "restrooms": "环湖步道每500米设有无障碍卫生间，配备扶手和紧急呼叫按钮。", "elevators": "观景台配备无障碍电梯，可直达山顶。", "pathways": "全程铺设防滑路面，坡度平缓不超过5度，轮椅可轻松通行。", "seating": "沿途设有多处无障碍休息区，配备遮阳设施和饮水点。"}'::jsonb
),
(
  'p2', 'hangzhou', '雷峰塔', 4.7, 4.7, '景点', 85, 'good', '良好',
  '2.5km', '1-2小时', '配备无障碍电梯，可直达塔顶观景，轮椅友好。', '配备无障碍电梯，可直达塔顶观景，轮椅友好。',
  ARRAY['有电梯', '有卫生间'], true, true, true,
  '杭州市西湖区', 'good', 'ramp-available', '主入口有台阶，但有专用坡道可以进入',
  'https://images.unsplash.com/photo-1638888197213-2c0f0b4d0b8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1638888197213-2c0f0b4d0b8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://picsum.photos/seed/b/800/400'
  ],
  '+86 571 8888 1234', 'info@leifengta.com', '8:00-17:00', '浙江省杭州市西湖区雷峰塔路', 'www.leifengta.com',
  '{"terrain": "主入口有台阶，但右侧有专门的无障碍坡道可以进入。塔内地面平整，电梯宽敞，可直达各层。", "entrances": "主入口设有无障碍坡道，有明显标识引导。", "parking": "停车场设有5个无障碍停车位。", "restrooms": "每层设有无障碍卫生间。", "elevators": "配备无障碍电梯，可直达塔顶。", "pathways": "塔内通道宽敞，轮椅可自由通行。", "seating": "各层设有休息区和观景台。"}'::jsonb
),
(
  'p3', 'hangzhou', '灵隐寺', 4.8, 4.8, '寺庙', 72, 'moderate', '一般',
  '3.8km', '2小时', '部分区域有台阶，但主要大殿可通过坡道进入。', '部分区域有台阶，但主要大殿可通过坡道进入。',
  ARRAY['平路多', '有卫生间'], true, false, true,
  '杭州市西湖区', 'fair', 'ramp-available', '正门有几级台阶，但右边有坡道可以进，里面大部分是平的',
  'https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY['https://images.unsplash.com/photo-1603120527222-33f28c2ce89e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'],
  '+86 571 8796 8666', 'info@lingyinsi.com', '7:00-18:00', '浙江省杭州市西湖区法云弄1号', 'www.lingyinsi.com',
  '{"terrain": "正门入口有台阶，但右侧约30米处有专门的无障碍入口，走坡道可以进入。进入后主要区域地面平整，但部分偏殿有台阶。", "entrances": "建议使用右侧无障碍专用入口，有明显标识引导。", "parking": "停车场设有无障碍停车位，距离坡道入口较近。", "restrooms": "设有无障碍卫生间，空间较宽敞。", "elevators": "无电梯设施。", "pathways": "主要通道宽敞，采用石材铺设，轮椅可通行。", "seating": "各殿前设有休息区。"}'::jsonb
),
-- 武汉景点
(
  'w1', 'wuhan', '东湖绿道', 4.9, 4.9, '公园', 95, 'excellent', '优秀',
  '0.8km', '2-3小时', '全长约30公里，全程无障碍步道，坡度平缓，非常适合轮椅用户游览。沿途配备多处无障碍卫生间和休息站。', '全长约30公里，全程无障碍步道，坡度平缓，非常适合轮椅用户游览。',
  ARRAY['平路多', '有卫生间', '停车近'], true, false, true,
  '武汉市武昌区', 'excellent', 'none', '路面非常平整，全程无台阶，坡度很小，轮椅可轻松通行',
  'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://picsum.photos/seed/w1/800/400',
    'https://picsum.photos/seed/w1b/800/400'
  ],
  '+86 27 8888 1234', 'info@donghulvdao.com', '全天开放', '湖北省武汉市武昌区东湖路', 'www.donghulvdao.com',
  '{"terrain": "绿道全程铺设平整的塑胶路面，防滑性能好，推轮椅非常轻松。坡度控制在5度以内，轮椅可以自己推上去。", "entrances": "多个入口均设有无障碍通道，主入口有自动门，轮椅可直接进入。", "parking": "各入口附近均设有无障碍停车位，共30个，免费使用。", "restrooms": "每2公里设有无障碍卫生间，配备扶手和紧急呼叫按钮，空间宽敞。", "elevators": "无电梯设施（平地游览）。", "pathways": "绿道宽度3-5米，轮椅可自由通行，路面平整防滑。", "seating": "沿途设有多处无障碍休息区，配备遮阳设施和饮水点。"}'::jsonb
),
(
  'w2', 'wuhan', '黄鹤楼', 4.7, 4.7, '景点', 88, 'good', '良好',
  '1.5km', '1-2小时', '配备无障碍电梯，可直达主楼观景台。入口处有无障碍通道，轮椅可轻松进入。', '配备无障碍电梯，可直达主楼观景台。入口处有无障碍通道，轮椅可轻松进入。',
  ARRAY['有电梯', '有卫生间', '停车近'], true, true, true,
  '武汉市武昌区', 'good', 'ramp-available', '主楼有台阶，但配备无障碍电梯，可直达各层',
  'https://images.unsplash.com/photo-1591604466377-1a63d39d0a0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY[
    'https://images.unsplash.com/photo-1591604466377-1a63d39d0a0c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    'https://picsum.photos/seed/w2/800/400'
  ],
  '+86 27 8888 5678', 'info@huanghelou.com', '8:00-18:00', '湖北省武汉市武昌区蛇山', 'www.huanghelou.com',
  '{"terrain": "主楼前有台阶，但左侧设有无障碍坡道可以进入。楼内地面平整。", "entrances": "主入口左侧设有无障碍通道，有明显标识引导。", "parking": "停车场设有8个无障碍停车位。", "restrooms": "每层设有无障碍卫生间。", "elevators": "配备无障碍电梯，可直达各层观景台。", "pathways": "楼内通道宽敞，轮椅可自由通行。", "seating": "各层设有休息区和观景台。"}'::jsonb
),
(
  'w3', 'wuhan', '武汉大学', 4.8, 4.8, '校园', 82, 'good', '良好',
  '2.3km', '2-3小时', '樱花大道全程无障碍，主要教学楼配备无障碍电梯。校园内有多处无障碍卫生间。', '樱花大道全程无障碍，主要教学楼配备无障碍电梯。校园内有多处无障碍卫生间。',
  ARRAY['平路多', '有电梯', '有卫生间'], true, true, true,
  '武汉市武昌区', 'good', 'occasional', '樱花大道很平整，但部分教学楼有台阶，需使用电梯',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY['https://images.unsplash.com/photo-1509062522246-3755977927d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'],
  '+86 27 6877 8888', 'info@whu.edu.cn', '全天开放', '湖北省武汉市武昌区珞珈山', 'www.whu.edu.cn',
  '{"terrain": "樱花大道全程平整，适合轮椅通行。部分教学楼有台阶，但配备无障碍电梯。", "entrances": "主要入口均设有无障碍通道。", "parking": "校内设有无障碍停车位。", "restrooms": "主要教学楼和图书馆设有无障碍卫生间。", "elevators": "主要教学楼配备无障碍电梯。", "pathways": "樱花大道和主要道路宽敞平整，轮椅可通行。", "seating": "多处设有休息区和观景台。"}'::jsonb
),
(
  'w4', 'wuhan', '户部巷', 4.6, 4.6, '美食街', 75, 'moderate', '一般',
  '1.2km', '1-2小时', '主要街道无障碍，但部分店铺有台阶。推荐在入口区域用餐，轮椅可通行。', '主要街道无障碍，但部分店铺有台阶。推荐在入口区域用餐，轮椅可通行。',
  ARRAY['平路多', '有卫生间'], true, false, false,
  '武汉市武昌区', 'fair', 'occasional', '主街道路面平整，但部分店铺有台阶，需要注意',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
  ARRAY['https://images.unsplash.com/photo-1504674900247-0877df9cc836?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080'],
  '+86 27 8888 9999', 'info@hubuxiang.com', '9:00-22:00', '湖北省武汉市武昌区户部巷', 'www.hubuxiang.com',
  '{"terrain": "主街道地面平整，但部分店铺有台阶，轮椅可通行主街道。", "entrances": "主入口无障碍，轮椅可直接进入。", "parking": "附近有公共停车场，但无专用无障碍停车位。", "restrooms": "设有无障碍卫生间。", "elevators": "无电梯设施。", "pathways": "主街道宽敞，轮椅可通行，但部分店铺需注意台阶。", "seating": "主街道设有休息区。"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
