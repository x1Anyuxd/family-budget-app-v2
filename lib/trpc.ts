export const trpc: any = {
  Provider: ({ children }: any) => children,
  useContext: () => ({}),
  receipt: {
    analyze: {
      useMutation: () => ({
        mutateAsync: async (data: { imageBase64: string; mimeType: string }) => {
          console.log('AI Receipt Analysis (Mocked Implementation)');
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return {
            success: true,
            data: {
              amount: 128.50,
              categoryId: 'food',
              merchant: '模拟超市',
              description: '识别自收据',
              confidence: 0.95
            }
          };
        },
        isLoading: false,
      }),
    },
  },
  ai: {
    parseVoiceCommand: {
      useMutation: () => ({
        mutateAsync: async (data: { text: string }) => {
          console.log('AI Voice Command Parsing:', data.text);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          
          let rawText = data.text.trim();
          let amount = 0;
          let categoryId = 'other_exp';
          let type = 'expense';
          let date = new Date();
          
          // --- 核心工具函数：中文数字转阿拉伯数字 ---
          const cnToNum = (cn: string): number => {
            if (!cn) return 0;
            const map: Record<string, number> = {
              '零': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
              '百': 100, '千': 1000, '万': 10000
            };
            
            // 处理 "块五" 这种结尾
            if (cn === '半') return 0.5;

            let res = 0;
            let section = 0;
            let number = 0;
            
            for (let i = 0; i < cn.length; i++) {
              const char = cn[i];
              const val = map[char];
              if (val === undefined) {
                const digit = parseInt(char);
                if (!isNaN(digit)) number = digit;
                continue;
              }
              if (val >= 10) {
                if (val === 10 && number === 0 && i === 0) number = 1; // 处理 "十" 开头
                section += (number || 1) * val;
                number = 0;
              } else {
                number = val;
              }
            }
            return section + number;
          };

          // --- 1. 锁定并解析日期 (最高优先级) ---
          let textForAmount = rawText;

          // 识别年份 (如 "2023年")
          const yearMatch = rawText.match(/(\d{4})\s*年/);
          if (yearMatch) {
            date.setFullYear(parseInt(yearMatch[1]));
            textForAmount = textForAmount.replace(yearMatch[0], ' '); // 彻底移除年份，避免干扰金额
          } else if (rawText.includes('去年')) {
            date.setFullYear(date.getFullYear() - 1);
            textForAmount = textForAmount.replace('去年', ' ');
          }

          // 识别月日 (支持中文和数字)
          const absDateMatch = rawText.match(/([0-9一二三四五六七八九十百]+)\s*月\s*([0-9一二三四五六七八九十]+)\s*[号日]?/);
          if (absDateMatch) {
            const month = cnToNum(absDateMatch[1]);
            const day = cnToNum(absDateMatch[2]);
            if (!isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
              // 重新初始化日期对象，确保只设置指定的年月日
              const today = new Date();
              date = new Date(today.getFullYear(), month - 1, day);
              // 如果解析的月份大于当前月份，则假设是去年
              if (month > today.getMonth() + 1) {
                date.setFullYear(today.getFullYear() - 1);
              }
              textForAmount = textForAmount.replace(absDateMatch[0], ' ');
            }
          }

          // 处理相对日期
          const relativeDates: Record<string, number> = { '今天': 0, '昨天': -1, '前天': -2, '上周': -7 };
          for (const [key, offset] of Object.entries(relativeDates)) {
            if (rawText.includes(key)) {
              // 只在没有识别到绝对日期时才处理相对日期
              if (!absDateMatch) {
                date.setDate(date.getDate() + offset);
              }
              textForAmount = textForAmount.replace(key, ' ');
            }
          }

          // --- 2. 金额解析 (重构：支持中文大写金额) ---
          // 清理杂质
          textForAmount = textForAmount.replace(/[¥￥$]/g, ' ').replace(/点/g, '.');

          // 模式 A: 识别中文大写金额 (如 "四百八十二块五")
          const cnAmountMatch = textForAmount.match(/([一二两三四五六七八九十百千]+)\s*块\s*([一二三四五六七八九十]?)/);
          if (cnAmountMatch) {
            const integerPart = cnToNum(cnAmountMatch[1]);
            const decimalPart = cnAmountMatch[2] ? cnToNum(cnAmountMatch[2]) / 10 : 0;
            amount = integerPart + decimalPart;
          } else {
            // 模式 B: 标准数字金额提取
            const amountRegexes = [
              /(\d+\.\d+|\d+)\s*[块元]/,
              /(花了|用了|支付|支出|记|入账|消费)\s*(\d+\.\d+|\d+)/,
              /(\d+\.\d+|\d+)/
            ];
            for (const regex of amountRegexes) {
              const match = textForAmount.match(regex);
              if (match) {
                const val = parseFloat(regex.toString().includes('花了') ? match[2] : match[1]);
                if (!isNaN(val) && val > 0) {
                  amount = val;
                  break;
                }
              }
            }
          }
          
          // --- 3. 语义分类映射 ---
          const semanticMap: Record<string, string[]> = {
            food: ['吃', '饭', '餐', '面', '火锅', '外卖', '零食', '超市', '菜', '喝', '奶茶', '咖啡', '麦当劳', '肯德基', '汉堡', '必胜客', '星巴克'],
            transport: ['打车', '公交', '地铁', '油', '停车', '高铁', '飞机', '打的', '滴滴', '共享单车'],
            shopping: ['买', '购物', '淘宝', '京东', '拼多多', '天猫', '超市', '商场', '唯品会', '衣服', '鞋', '包'],
            housing: ['房租', '房贷', '物业', '装修', '家具', '水电'],
            entertain: ['电影', '游戏', '唱K', '游乐园', '酒吧', '旅游', '门票', '网吧', '充值', '抖音'],
            medical: ['医生', '牙医', '看病', '药', '医院', '挂号', '体检', '手术', '诊所'],
            education: ['书', '学费', '培训', '课程', '考试', '报名', '文具'],
            utilities: ['水费', '电费', '燃气', '话费', '网费', '煤气', '缴费'],
            clothing: ['衣服', '鞋', '包', '裙', '裤', '理发', '剪头', '美容', '化妆品'],
            salary: ['工资', '薪水', '奖金', '发钱', '月薪'],
            investment: ['理财', '股票', '基金', '分红', '收益', '利息'],
            bonus: ['中奖', '红包', '外快', '奖励', '转账']
          };

          for (const [cat, keywords] of Object.entries(semanticMap)) {
            if (keywords.some(key => rawText.includes(key))) {
              categoryId = cat;
              type = ['salary', 'investment', 'bonus'].includes(cat) ? 'income' : 'expense';
              break;
            }
          }

          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

          return {
            success: true,
            data: {
              amount,
              categoryId,
              type,
              note: rawText,
              date: formattedDate
            }
          };
        },
        isLoading: false,
      })
    }
  }
};

export const createTRPCClient = () => ({});
