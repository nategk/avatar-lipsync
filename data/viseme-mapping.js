export const FACE_CAP_REST_STATE = {
  "brows": {
    "browDownLeft": 0,
    "browDownRight": 0,
    "browInnerUp": 0,
    "browOuterUpLeft": 0,
    "browOuterUpRight": 0
  },
  "mouth": {
    "cheekPuff": 0,
    "cheekSquintLeft": 0,
    "cheekSquintRight": 0,
    "eyeBlinkLeft": 0,
    "eyeBlinkRight": 0,
    "eyeLookDownLeft": 0,
    "eyeLookDownRight": 0,
    "eyeLookInLeft": 0,
    "eyeLookInRight": 0,
    "eyeLookOutLeft": 0,
    "eyeLookOutRight": 0,
    "eyeLookUpLeft": 0,
    "eyeLookUpRight": 0,
    "eyeSquintLeft": 0,
    "eyeSquintRight": 0,
    "eyeWideLeft": 0,
    "eyeWideRight": 0,
    "jawForward": 0,
    "jawLeft": 0,
    "jawOpen": 0,
    "jawRight": 0,
    "mouthClose": 0,
    "mouthDimpleLeft": 0,
    "mouthDimpleRight": 0,
    "mouthFrownLeft": 0,
    "mouthFrownRight": 0,
    "mouthFunnel": 0,
    "mouthLowerDownLeft": 0,
    "mouthLowerDownRight": 0,
    "mouthPressLeft": 0,
    "mouthPressRight": 0,
    "mouthPucker": 0,
    "mouthRollLower": 0,
    "mouthRollUpper": 0,
    "mouthShrugLower": 0,
    "mouthShrugUpper": 0,
    "mouthSmileLeft": 0,
    "mouthSmileRight": 0,
    "mouthStretchLeft": 0,
    "mouthStretchRight": 0,
    "mouthUpperUpLeft": 0,
    "mouthUpperUpRight": 0,
    "noseSneerLeft": 0,
    "noseSneerRight": 0,
    "tongueOut": 0
  }
};

const faceCapVisemeMapping = {
  "sil": {
    "mouth": {
      "cheekPuff": 0,
      "cheekSquintLeft": 0,
      "cheekSquintRight": 0,
      "eyeBlinkLeft": 0,
      "eyeBlinkRight": 0,
      "eyeLookDownLeft": 0,
      "eyeLookDownRight": 0,
      "eyeLookInLeft": 0,
      "eyeLookInRight": 0,
      "eyeLookOutLeft": 0,
      "eyeLookOutRight": 0,
      "eyeLookUpLeft": 0,
      "eyeLookUpRight": 0,
      "eyeSquintLeft": 0,
      "eyeSquintRight": 0,
      "eyeWideLeft": 0,
      "eyeWideRight": 0,
      "jawForward": 0,
      "jawLeft": 0,
      "jawOpen": 0,
      "jawRight": 0,
      "mouthClose": 0,
      "mouthDimpleLeft": 0,
      "mouthDimpleRight": 0,
      "mouthFrownLeft": 0,
      "mouthFrownRight": 0,
      "mouthFunnel": 0,
      "mouthLowerDownLeft": 0,
      "mouthLowerDownRight": 0,
      "mouthPressLeft": 0,
      "mouthPressRight": 0,
      "mouthPucker": 0,
      "mouthRollLower": 0,
      "mouthRollUpper": 0,
      "mouthShrugLower": 0,
      "mouthShrugUpper": 0,
      "mouthSmileLeft": 0,
      "mouthSmileRight": 0,
      "mouthStretchLeft": 0,
      "mouthStretchRight": 0,
      "mouthUpperUpLeft": 0,
      "mouthUpperUpRight": 0,
      "noseSneerLeft": 0,
      "noseSneerRight": 0,
      "tongueOut": 0.00014
    },
    "brows": {
      "browDownLeft": 0,
      "browDownRight": 0,
      "browInnerUp": 0,
      "browOuterUpLeft": 0,
      "browOuterUpRight": 0
    }
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
      "mouthClose": 0.15,
      "mouthPucker": 0.27,
      "mouthPressLeft": 0.43,
      "mouthPressRight": 0.45,
      "jawForward": 0,
      "mouthDimpleRight": 0,
      "mouthFrownLeft": 0,
      "mouthRollUpper": 0.32,
      "mouthShrugLower": 0,
      "mouthShrugUpper": 0.46
    },
    "brows": {
      "eyebrowRaise": 0.05
    }
  },
  "TH": {
    "mouth": {
      "jawOpen": 0.35,
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
      "mouthClose": 0.45,
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
      "mouthClose": 0.04,
      "mouthPucker": 0.28,
      "mouthSmileLeft": 0.28,
      "mouthSmileRight": 0.28,
      "mouthStretchLeft": 0.38,
      "mouthStretchRight": 0.36
    },
    "brows": {
      "eyebrowRaise": 0.06
    }
  },
  "kk": {
    "mouth": {
      "jawOpen": 0.35,
      "mouthClose": 0.25
    },
    "brows": {}
  },
  "CH": {
    "mouth": {
      "jawOpen": 0.22,
      "mouthFunnel": 0,
      "mouthPucker": 0,
      "jawForward": 0.65,
      "mouthClose": 0.28
    },
    "brows": {
      "eyebrowRaise": 0.08
    }
  },
  "SS": {
    "mouth": {
      "jawOpen": 0.43,
      "mouthStretchLeft": 0.34,
      "mouthStretchRight": 0.34,
      "mouthClose": 0.28,
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
      "mouthClose": 0.35
    },
    "brows": {}
  },
  "RR": {
    "mouth": {
      "jawOpen": 0.35,
      "mouthPucker": 0.2,
      "mouthClose": 0.25
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
      "mouthRollLower": 0.67,
      "mouthRollUpper": 0.66,
      "mouthClose": 0,
      "mouthStretchLeft": 0.96,
      "mouthStretchRight": 1,
      "mouthSmileRight": 0,
      "mouthFrownLeft": 0,
      "mouthDimpleLeft": 0,
      "mouthShrugLower": 0,
      "mouthShrugUpper": 0,
      "mouthSmileLeft": 0
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
      "jawOpen": 0.68,
      "mouthFunnel": 0,
      "mouthPucker": 0,
      "Sad": 0,
      "Surprised": 0,
      "Angry": 0,
      "mouthPressLeft": 0,
      "mouthPressRight": 0,
      "jawRight": 0,
      "mouthClose": 0,
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
      "mouthClose": 0.19,
      "mouthPressLeft": 0.4,
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
