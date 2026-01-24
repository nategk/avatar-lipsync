export const FACE_CAP_REST_STATE = {
  "brows": {
    "browDownLeft": 0,
    "browDownRight": 0,
    "browInnerUp": 0.12167,
    "browOuterUpLeft": 0.02322,
    "browOuterUpRight": 0.02321
  },
  "mouth": {
    "cheekPuff": 0.07211,
    "cheekSquintLeft": 0.06493,
    "cheekSquintRight": 0.06679,
    "eyeBlinkLeft": 0.06235,
    "eyeBlinkRight": 0.0623,
    "eyeLookDownLeft": 0.32136,
    "eyeLookDownRight": 0.32038,
    "eyeLookInLeft": 0,
    "eyeLookInRight": 0.13493,
    "eyeLookOutLeft": 0.02952,
    "eyeLookOutRight": 0,
    "eyeLookUpLeft": 0,
    "eyeLookUpRight": 0,
    "eyeSquintLeft": 0.06009,
    "eyeSquintRight": 0.06009,
    "eyeWideLeft": 0,
    "eyeWideRight": 0,
    "jawForward": 0.09864,
    "jawLeft": 0.04152,
    "jawOpen": 0.1371,
    "jawRight": 0,
    "mouthClose": 0.15055,
    "mouthDimpleLeft": 0.11703,
    "mouthDimpleRight": 0.11252,
    "mouthFrownLeft": 0.12203,
    "mouthFrownRight": 0.11968,
    "mouthFunnel": 0.0726,
    "mouthLowerDownLeft": 0.09089,
    "mouthLowerDownRight": 0.09187,
    "mouthPressLeft": 0.11132,
    "mouthPressRight": 0.11226,
    "mouthPucker": 0.15672,
    "mouthRollLower": 0.35175,
    "mouthRollUpper": 0.08684,
    "mouthShrugLower": 0.23266,
    "mouthShrugUpper": 0.30389,
    "mouthSmileLeft": 0,
    "mouthSmileRight": 0,
    "mouthStretchLeft": 0.18252,
    "mouthStretchRight": 0.15953,
    "mouthUpperUpLeft": 0.04365,
    "mouthUpperUpRight": 0.04553,
    "noseSneerLeft": 0.09437,
    "noseSneerRight": 0.08506,
    "tongueOut": 0.00014
  }
};

const faceCapVisemeMapping = {
  "sil": {
    "mouth": {},
    "brows": {}
  },
  "AA": {
    "mouth": {
      "jawOpen": 0.95,
      "mouthFunnel": 0.1,
      "mouthPucker": 0.05
    },
    "brows": {
      "eyebrowRaise": 0.08,
      "eyebrowTilt": 0.02
    }
  },
  "EE": {
    "mouth": {
      "jawOpen": 0.25,
      "mouthStretchLeft": 0.6,
      "mouthStretchRight": 0.6,
      "mouthSmileLeft": 0.25,
      "mouthSmileRight": 0.25
    },
    "brows": {
      "eyebrowRaise": 0.1,
      "eyebrowTilt": 0.02
    }
  },
  "OO": {
    "mouth": {
      "jawOpen": 0.6,
      "mouthPucker": 0.9,
      "mouthFunnel": 0.75
    },
    "brows": {
      "eyebrowRaise": 0.05,
      "eyebrowTilt": -0.01
    }
  },
  "MM": {
    "mouth": {
      "mouthClose": 1,
      "mouthPressLeft": 0.4,
      "mouthPressRight": 0.4
    },
    "brows": {
      "eyebrowRaise": 0.04
    }
  },
  "FF": {
    "mouth": {
      "mouthClose": 0.5,
      "mouthPucker": 0.35,
      "mouthPressLeft": 0.45,
      "mouthPressRight": 0.45
    },
    "brows": {
      "eyebrowRaise": 0.05
    }
  },
  "TH": {
    "mouth": {
      "jawOpen": 1,
      "mouthPucker": 0.1,
      "mouthFunnel": 0,
      "cheekPuff": 0.27,
      "cheekSquintLeft": 0,
      "eyeBlinkLeft": 0,
      "eyeSquintLeft": 0.25,
      "eyeSquintRight": 0.26,
      "jawForward": 0,
      "tongueOut": 0,
      "jawRight": 0,
      "mouthDimpleRight": 0,
      "mouthClose": 0.9,
      "mouthSmileLeft": 0.3,
      "mouthSmileRight": 0.3,
      "mouthStretchLeft": 0.41,
      "mouthStretchRight": 0.39,
      "mouthUpperUpRight": 0.19,
      "noseSneerLeft": 0,
      "mouthUpperUpLeft": 0.19
    },
    "brows": {
      "eyebrowRaise": 0.1,
      "eyebrowTilt": 0.05,
      "browDownLeft": 0.43,
      "browDownRight": 0.44,
      "browInnerUp": 0
    }
  },
  "DD": {
    "mouth": {
      "jawOpen": 0,
      "mouthClose": 0.83
    },
    "brows": {
      "eyebrowRaise": 0.06
    }
  },
  "kk": {
    "mouth": {
      "jawOpen": 0.35,
      "mouthClose": 0.54
    },
    "brows": {}
  },
  "CH": {
    "mouth": {
      "jawOpen": 0.22,
      "mouthFunnel": 0,
      "mouthPucker": 0,
      "jawForward": 0.65,
      "mouthClose": 0.69
    },
    "brows": {
      "eyebrowRaise": 0.08
    }
  },
  "SS": {
    "mouth": {
      "jawOpen": 0.18,
      "mouthStretchLeft": 0.34,
      "mouthStretchRight": 0.34,
      "mouthClose": 0.71,
      "mouthPucker": 0,
      "mouthSmileLeft": 0.99,
      "mouthSmileRight": 1
    },
    "brows": {
      "eyebrowRaise": 0.06
    }
  },
  "nn": {
    "mouth": {
      "jawOpen": 0.2,
      "mouthClose": 0.74
    },
    "brows": {}
  },
  "RR": {
    "mouth": {
      "jawOpen": 0.35,
      "mouthPucker": 0.2,
      "mouthClose": 0.46
    },
    "brows": {}
  },
  "E": {
    "mouth": {
      "jawOpen": 0.14,
      "mouthClose": 0,
      "mouthSmileLeft": 0.2,
      "mouthSmileRight": 0.2,
      "mouthStretchLeft": 0.48,
      "mouthStretchRight": 0.5,
      "mouthFunnel": 0,
      "mouthDimpleLeft": 0.7,
      "mouthDimpleRight": 0.7
    },
    "brows": {
      "eyebrowRaise": 0.07,
      "eyebrowTilt": 0.05
    }
  },
  "I": {
    "mouth": {
      "jawOpen": 0.18,
      "mouthSmileLeft": 0.28,
      "mouthSmileRight": 0.28
    },
    "brows": {
      "eyebrowRaise": 0.1
    }
  },
  "O": {
    "mouth": {
      "jawOpen": 0.54,
      "mouthPucker": 0,
      "mouthFunnel": 1,
      "mouthRollLower": 0.65,
      "mouthRollUpper": 0.66,
      "mouthClose": 0,
      "mouthStretchLeft": 0.96,
      "mouthStretchRight": 1,
      "mouthSmileRight": 0,
      "mouthFrownLeft": 0
    },
    "brows": {
      "eyebrowRaise": 0.05,
      "eyebrowTilt": -0.01
    }
  },
  "U": {
    "mouth": {
      "jawOpen": 0.3,
      "mouthPucker": 0.6,
      "mouthFunnel": 0.3
    },
    "brows": {
      "eyebrowRaise": 0.04
    }
  },
  "aa": {
    "mouth": {
      "jawOpen": 0.49,
      "mouthFunnel": 0,
      "mouthPucker": 0,
      "Sad": 0,
      "Surprised": 0,
      "Angry": 0,
      "mouthPressLeft": 0,
      "mouthPressRight": 0,
      "jawRight": 0,
      "mouthClose": 0.45,
      "mouthSmileLeft": 0.29,
      "mouthSmileRight": 0.29,
      "mouthStretchRight": 0,
      "tongueOut": 0
    },
    "brows": {
      "eyebrowRaise": 0.08,
      "eyebrowTilt": 0.02,
      "browDownLeft": 0,
      "browDownRight": 0
    }
  },
  "PP": {
    "mouth": {
      "mouthClose": 0.4,
      "mouthPressLeft": 0.41,
      "mouthPressRight": 0.4,
      "mouthPucker": 0,
      "mouthSmileRight": 0.42,
      "mouthSmileLeft": 0.46,
      "mouthStretchLeft": 0
    },
    "brows": {
      "eyebrowRaise": 0.04
    }
  }
};

export default faceCapVisemeMapping;
