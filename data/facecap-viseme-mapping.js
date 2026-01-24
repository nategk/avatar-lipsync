/**
 * ARKit blendshape canonical list, pulled from Apple's `ARFaceAnchor.BlendShapeLocation`.
 * All viseme mappings should reference these names so different rigs can resolve them via adapters.
 */
export const ARKIT_BLENDSHAPES = [
  "browDownLeft",
  "browDownRight",
  "browInnerUp",
  "browOuterUpLeft",
  "browOuterUpRight",
  "cheekPuff",
  "cheekSquintLeft",
  "cheekSquintRight",
  "eyeBlinkLeft",
  "eyeBlinkRight",
  "eyeLookDownLeft",
  "eyeLookDownRight",
  "eyeLookInLeft",
  "eyeLookInRight",
  "eyeLookOutLeft",
  "eyeLookOutRight",
  "eyeLookUpLeft",
  "eyeLookUpRight",
  "eyeSquintLeft",
  "eyeSquintRight",
  "eyeWideLeft",
  "eyeWideRight",
  "jawForward",
  "jawLeft",
  "jawOpen",
  "jawRight",
  "mouthClose",
  "mouthDimpleLeft",
  "mouthDimpleRight",
  "mouthFrownLeft",
  "mouthFrownRight",
  "mouthFunnel",
  "mouthLeft",
  "mouthLowerDownLeft",
  "mouthLowerDownRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthPucker",
  "mouthRight",
  "mouthRollLower",
  "mouthRollUpper",
  "mouthShrugLower",
  "mouthShrugUpper",
  "mouthSmileLeft",
  "mouthSmileRight",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthUpperUpLeft",
  "mouthUpperUpRight",
  "noseSneerLeft",
  "noseSneerRight",
  "tongueOut",
];

/**
 * Rest-state weights extracted directly from `models/facecap.glb`. These values represent the
 * baseline blendshape contributions when the FaceCap mesh is initialized in Three.js before any
 * viseme adjustments are applied. Each value is clamped to the 0-1 range used in the example
 * `three.js webgl - morph targets - face` demo.
 */
export const FACE_CAP_REST_STATE = {
  brows: {
    browDownLeft: 0,
    browDownRight: 0,
    browInnerUp: 0.12167,
    browOuterUpLeft: 0.02322,
    browOuterUpRight: 0.02321,
  },
  mouth: {
    cheekPuff: 0.07211,
    cheekSquintLeft: 0.06493,
    cheekSquintRight: 0.06679,
    eyeBlinkLeft: 0.06235,
    eyeBlinkRight: 0.0623,
    eyeLookDownLeft: 0.32136,
    eyeLookDownRight: 0.32038,
    eyeLookInLeft: 0,
    eyeLookInRight: 0.13493,
    eyeLookOutLeft: 0.02952,
    eyeLookOutRight: 0,
    eyeLookUpLeft: 0,
    eyeLookUpRight: 0,
    eyeSquintLeft: 0.06009,
    eyeSquintRight: 0.06009,
    eyeWideLeft: 0,
    eyeWideRight: 0,
    jawForward: 0.09864,
    jawLeft: 0.04152,
    jawOpen: 0.1371,
    jawRight: 0,
    mouthClose: 0.15055,
    mouthDimpleLeft: 0.11703,
    mouthDimpleRight: 0.11252,
    mouthFrownLeft: 0.12203,
    mouthFrownRight: 0.11968,
    mouthFunnel: 0.0726,
    mouthLowerDownLeft: 0.09089,
    mouthLowerDownRight: 0.09187,
    mouthPressLeft: 0.11132,
    mouthPressRight: 0.11226,
    mouthPucker: 0.15672,
    mouthRollLower: 0.35175,
    mouthRollUpper: 0.08684,
    mouthShrugLower: 0.23266,
    mouthShrugUpper: 0.30389,
    mouthSmileLeft: 0,
    mouthSmileRight: 0,
    mouthStretchLeft: 0.18252,
    mouthStretchRight: 0.15953,
    mouthUpperUpLeft: 0.04365,
    mouthUpperUpRight: 0.04553,
    noseSneerLeft: 0.09437,
    noseSneerRight: 0.08506,
    tongueOut: 0.00014,
  },
};

/**
 * Mapping from visemes to blendshape sets. Each viseme targets a subset of ARKit blendshapes,
 * plus optional brow adjustments. This is a canonical reference, and rigs should supply adapters
 * that resolve their own morph names to these blendshape values.
 */
const faceCapVisemeMapping = {
  sil: {
    mouth: {},
    brows: {},
    note: "Neutral rest pose (zeroed) for FaceCap",
  },
  AA: {
    mouth: { jawOpen: 0.95, mouthFunnel: 0.1, mouthPucker: 0.05 },
    brows: { eyebrowRaise: 0.08, eyebrowTilt: 0.02 },
    source: "Apple ARKit + TalkingHead reference",
  },
  EE: {
    mouth: {
      jawOpen: 0.25,
      mouthStretchLeft: 0.6,
      mouthStretchRight: 0.6,
      mouthSmileLeft: 0.25,
      mouthSmileRight: 0.25,
    },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.02 },
    source: "TalkingHead",
  },
  OO: {
    mouth: { jawOpen: 0.6, mouthPucker: 0.9, mouthFunnel: 0.75 },
    brows: { eyebrowRaise: 0.05, eyebrowTilt: -0.01 },
    source: "Meta OVR reference",
  },
  MM: {
    mouth: { mouthClose: 1, mouthPressLeft: 0.4, mouthPressRight: 0.4 },
    brows: { eyebrowRaise: 0.04 },
    note: "Bilabial (lips pressed together)",
  },
  FF: {
    mouth: {
      mouthClose: 0.88,
      mouthPucker: 0.35,
      mouthPressLeft: 0.45,
      mouthPressRight: 0.45,
    },
    brows: { eyebrowRaise: 0.05 },
    source: "TalkingHead/OVR",
  },
  TH: {
    mouth: { jawOpen: 0.3, mouthPucker: 0.1, mouthFunnel: 0.1 },
    brows: { eyebrowRaise: 0.1, eyebrowTilt: 0.05 },
  },
  DD: {
    mouth: { jawOpen: 0.4, mouthClose: 0.15 },
    brows: { eyebrowRaise: 0.06 },
  },
  kk: {
    mouth: { jawOpen: 0.35, mouthClose: 0.15 },
  },
  CH: {
    mouth: { jawOpen: 0.45, mouthFunnel: 0.25, mouthPucker: 0.15 },
    brows: { eyebrowRaise: 0.08 },
  },
  SS: {
    mouth: { jawOpen: 0.18, mouthStretchLeft: 0.34, mouthStretchRight: 0.34 },
    brows: { eyebrowRaise: 0.06 },
  },
  nn: {
    mouth: { jawOpen: 0.2, mouthClose: 0.1 },
  },
  RR: {
    mouth: { jawOpen: 0.35, mouthPucker: 0.2 },
  },
  E: {
    mouth: {
      jawOpen: 0.2,
      mouthClose: 0.25,
      mouthSmileLeft: 0.2,
      mouthSmileRight: 0.2,
      mouthStretchLeft: 0.5,
      mouthStretchRight: 0.5,
    },
    brows: { eyebrowRaise: 0.07, eyebrowTilt: 0.05 },
  },
  I: {
    mouth: { jawOpen: 0.18, mouthSmileLeft: 0.28, mouthSmileRight: 0.28 },
    brows: { eyebrowRaise: 0.1 },
  },
  O: {
    mouth: { jawOpen: 0.5, mouthPucker: 0.85, mouthFunnel: 0.7 },
    brows: { eyebrowRaise: 0.05 },
  },
  U: {
    mouth: { jawOpen: 0.3, mouthPucker: 0.6, mouthFunnel: 0.3 },
    brows: { eyebrowRaise: 0.04 },
  },
};

export default faceCapVisemeMapping;
