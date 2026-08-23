/**
 * Golden values captured from the original p5.js sketch by running its own
 * node.js / edge.js / route.js under Node with a stubbed `dist`. The port must
 * reproduce them exactly, not approximately.
 *
 * The layout is deliberately irregular: on a circle the cheapest tour and the
 * best search order coincide, so a symmetric fixture would be blind to the one
 * behaviour that matters here.
 */
export interface GoldenRoute {
  readonly sequence: readonly number[];
  readonly cost: number;
  readonly expectedCost: number;
  readonly expectedCostNoReturn: number;
}

export interface GoldenCase {
  readonly nodes: readonly { label: number; x: number; y: number; p: number }[];
  readonly routes: readonly GoldenRoute[];
}

export const GOLDEN: Record<string, GoldenCase> = {
  '4': {
    nodes: [
      { label: 0, x: 184, y: 378.3, p: 0 },
      { label: 1, x: 356.2, y: 387.7, p: 0.3333333333333333 },
      { label: 2, x: 251.1, y: 99.5, p: 0.3333333333333333 },
      { label: 3, x: 189.3, y: 122, p: 0.3333333333333333 },
    ],
    routes: [
      { sequence: [0, 1, 2, 3, 0], cost: 801.3454121258865, expectedCost: 637.4137597738718, expectedCostNoReturn: 551.9621620383375 },
      { sequence: [0, 1, 3, 2, 0], cost: 838.7565681573435, expectedCost: 642.0837504838031, expectedCostNoReturn: 546.4967627594154 },
      { sequence: [0, 2, 1, 3, 0], cost: 1163.65232272395, expectedCost: 834.3857912257967, expectedCostNoReturn: 748.9341934902624 },
      { sequence: [0, 2, 3, 1, 0], cost: 838.7565681573434, expectedCost: 673.720902789589, expectedCostNoReturn: 616.2354456914866 },
      { sequence: [0, 3, 1, 2, 0], cost: 1163.65232272395, expectedCost: 806.3146166142021, expectedCostNoReturn: 710.7276288898145 },
      { sequence: [0, 3, 2, 1, 0], cost: 801.3454121258864, expectedCost: 640.9797374680631, expectedCostNoReturn: 583.4942803699607 },
    ],
  },
  '5': {
    nodes: [
      { label: 0, x: 184, y: 378.3, p: 0 },
      { label: 1, x: 356.2, y: 387.7, p: 0.25 },
      { label: 2, x: 251.1, y: 99.5, p: 0.25 },
      { label: 3, x: 189.3, y: 122, p: 0.25 },
      { label: 4, x: 309, y: 346.1, p: 0.25 },
    ],
    routes: [
      { sequence: [0, 1, 2, 3, 4, 0], cost: 928.1361243646772, expectedCost: 710.0943509215731, expectedCostNoReturn: 677.8241634414856 },
      { sequence: [0, 1, 2, 4, 3, 0], cost: 1242.9477898399705, expectedCost: 803.8631620160935, expectedCostNoReturn: 739.7744637144428 },
      { sequence: [0, 1, 3, 2, 4, 0], cost: 934.3824345789042, expectedCost: 715.1584215075784, expectedCostNoReturn: 682.8882340274909 },
      { sequence: [0, 1, 3, 4, 2, 0], cost: 1280.3589458714275, expectedCost: 809.3065705274338, expectedCostNoReturn: 737.616329734143 },
      { sequence: [0, 1, 4, 2, 3, 0], cost: 810.8015184319177, expectedCost: 573.9016074799092, expectedCostNoReturn: 509.8129091782585 },
      { sequence: [0, 1, 4, 3, 2, 0], cost: 841.9663642491475, expectedCost: 574.2809454052441, expectedCostNoReturn: 502.5907046119534 },
      { sequence: [0, 2, 1, 3, 4, 0], cost: 1290.4430349627407, expectedCost: 948.4001021600326, expectedCostNoReturn: 916.129914679945 },
      { sequence: [0, 2, 1, 4, 3, 0], cost: 1166.862118815754, expectedCost: 822.9726224434131, expectedCostNoReturn: 758.8839241417625 },
      { sequence: [0, 2, 3, 1, 4, 0], cost: 858.2967635546879, expectedCost: 719.8648679808638, expectedCostNoReturn: 687.5946805007762 },
      { sequence: [0, 2, 3, 4, 1, 0], cost: 841.9663642491475, expectedCost: 690.011857641115, expectedCostNoReturn: 646.8977648175381 },
      { sequence: [0, 2, 4, 1, 3, 0], cost: 1173.1084290299812, expectedCost: 797.8043447643345, expectedCostNoReturn: 733.7156464626838 },
      { sequence: [0, 2, 4, 3, 1, 0], cost: 1280.3589458714273, expectedCost: 893.3788141412053, expectedCostNoReturn: 850.2647213176285 },
      { sequence: [0, 3, 1, 2, 4, 0], cost: 1259.2781891455109, expectedCost: 919.5555097470292, expectedCostNoReturn: 887.2853222669416 },
      { sequence: [0, 3, 1, 4, 2, 0], cost: 1173.1084290299812, expectedCost: 797.6305230628582, expectedCostNoReturn: 725.9402822695674 },
      { sequence: [0, 3, 2, 1, 4, 0], cost: 820.8856075232309, expectedCost: 685.9562049818552, expectedCostNoReturn: 653.6860175017677 },
      { sequence: [0, 3, 2, 4, 1, 0], cost: 810.8015184319177, expectedCost: 659.2263497492199, expectedCostNoReturn: 616.1122569256431 },
      { sequence: [0, 3, 4, 1, 2, 0], cost: 1166.862118815754, expectedCost: 766.2159351695526, expectedCostNoReturn: 694.5256943762619 },
      { sequence: [0, 3, 4, 2, 1, 0], cost: 1242.9477898399705, expectedCost: 861.4110666210885, expectedCostNoReturn: 818.2969737975117 },
      { sequence: [0, 4, 1, 2, 3, 0], cost: 820.8856075232309, expectedCost: 557.2558413385873, expectedCostNoReturn: 493.1671430369366 },
      { sequence: [0, 4, 1, 3, 2, 0], cost: 858.2967635546879, expectedCost: 560.7583343710357, expectedCostNoReturn: 489.068093577745 },
      { sequence: [0, 4, 2, 1, 3, 0], cost: 1259.2781891455106, expectedCost: 762.049118195693, expectedCostNoReturn: 697.9604198940424 },
      { sequence: [0, 4, 2, 3, 1, 0], cost: 934.3824345789043, expectedCost: 641.5504518685374, expectedCostNoReturn: 598.4363590449606 },
      { sequence: [0, 4, 3, 1, 2, 0], cost: 1290.4430349627407, expectedCost: 764.3693715999198, expectedCostNoReturn: 692.679130806629 },
      { sequence: [0, 4, 3, 2, 1, 0], cost: 928.1361243646771, expectedCost: 640.3682122403156, expectedCostNoReturn: 597.2541194167388 },
    ],
  },
};
