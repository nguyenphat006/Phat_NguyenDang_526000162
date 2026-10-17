// Data table "pricing" (JSON structure). Loaded with a plain <script> tag so the site also opens from disk.
window.Ericss = window.Ericss || {};
Ericss.data = Ericss.data || {};
Ericss.data.pricing = {
  "currency": "VND",
  "vatRate": 0.1,
  "volumeDiscounts": [
    {
      "minQty": 5,
      "rate": 0.03
    },
    {
      "minQty": 10,
      "rate": 0.05
    },
    {
      "minQty": 20,
      "rate": 0.08
    }
  ],
  "coupons": [
    {
      "code": "ERICSS10",
      "rate": 0.1,
      "minSubtotal": 20000000
    },
    {
      "code": "WELCOME5",
      "rate": 0.05,
      "minSubtotal": 0
    }
  ],
  "estimator": {
    "types": {
      "table": {
        "label": {
          "vi": "Bàn ăn",
          "en": "Dining table"
        },
        "base": 9000000,
        "days": 20
      },
      "chair": {
        "label": {
          "vi": "Ghế",
          "en": "Chair"
        },
        "base": 2500000,
        "days": 15
      },
      "sofa": {
        "label": {
          "vi": "Sofa",
          "en": "Sofa"
        },
        "base": 15000000,
        "days": 28
      }
    },
    "materials": {
      "teak": {
        "label": {
          "vi": "Teak",
          "en": "Teak"
        },
        "multiplier": 1.4,
        "days": 6
      },
      "aluminum": {
        "label": {
          "vi": "Nhôm",
          "en": "Aluminum"
        },
        "multiplier": 1.0,
        "days": 0
      },
      "rope": {
        "label": {
          "vi": "Dây thừng",
          "en": "Rope"
        },
        "multiplier": 1.15,
        "days": 7
      },
      "wicker": {
        "label": {
          "vi": "Mây nhựa",
          "en": "Resin wicker"
        },
        "multiplier": 1.1,
        "days": 7
      }
    },
    "sizes": {
      "s": {
        "label": {
          "vi": "Nhỏ",
          "en": "Small"
        },
        "multiplier": 0.85,
        "days": 0
      },
      "m": {
        "label": {
          "vi": "Tiêu chuẩn",
          "en": "Standard"
        },
        "multiplier": 1.0,
        "days": 0
      },
      "l": {
        "label": {
          "vi": "Lớn",
          "en": "Large"
        },
        "multiplier": 1.3,
        "days": 5
      }
    },
    "finishes": {
      "natural": {
        "label": {
          "vi": "Dầu tự nhiên",
          "en": "Natural oil"
        },
        "fee": 0,
        "days": 0
      },
      "matte": {
        "label": {
          "vi": "Sơn nhám",
          "en": "Matte paint"
        },
        "fee": 350000,
        "days": 2
      },
      "premium": {
        "label": {
          "vi": "Hoàn thiện cao cấp",
          "en": "Premium finish"
        },
        "fee": 900000,
        "days": 4
      }
    }
  }
};
