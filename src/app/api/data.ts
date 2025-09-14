// {
//     "source-ref": "s3://find-my-horse/data/images/prestige_good/CAS_5027.JPG",
//     "find-my-horse-test_BB": {
//       "annotations": [
//         {
//           "left": 1583,
//           "top": 579,
//           "width": 731,
//           "height": 2124,
//           "class_id": 0
//         }
//       ],
//       "image_size": [{ "width": 4096, "height": 2731, "depth": 3 }]
//     },
//     "find-my-horse-test_BB-metadata": {
//       "job-name": "labeling-job/find-my-horse-test_BB",
//       "class-map": { "0": "Prestige Good" },
//       "human-annotated": "yes",
//       "objects": [{ "confidence": 1 }],
//       "creation-date": "2025-08-15T19:04:28.750Z",
//       "type": "groundtruth/object-detection"
//     }
//   },

export const data = {
  id: "12345678",
  horse_name: "Prestige Good",
  image_uri: "s3://find-my-horse-test/images/test-image.jpg",
  annotations: [
    {
      score: 1, // 0 to 1
      left: 50, // should be in pct (0 to 1)
      top: 50, // should be in pct (0 to 1)
      width: 200, // should be in pct (0 to 1)
      height: 200, // should be in pct (0 to 1)
    },
  ],
  labeled_at: "2024-06-20T12:00:00Z",
};
