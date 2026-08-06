-- Data backfill
UPDATE `active_scenes` AS active
JOIN `scenes` AS scene ON scene.`id` = active.`sceneId`
LEFT JOIN `assets` AS asset ON asset.`id` = scene.`assetId`
SET active.`sceneSnapshot` = JSON_OBJECT(
  'id', scene.`id`,
  'type', scene.`type`,
  'name', scene.`name`,
  'title', scene.`title`,
  'subtitle', scene.`subtitle`,
  'message', scene.`message`,
  'config', COALESCE(scene.`config`, JSON_OBJECT()),
  'displayOrder', scene.`displayOrder`,
  'asset', CASE
    WHEN asset.`id` IS NULL THEN NULL
    ELSE JSON_OBJECT(
      'id', asset.`id`,
      'originalName', asset.`originalName`,
      'publicPath', asset.`publicPath`,
      'mimeType', asset.`mimeType`
    )
  END,
  'createdAt', DATE_FORMAT(scene.`createdAt`, '%Y-%m-%dT%H:%i:%s.000Z'),
  'updatedAt', DATE_FORMAT(scene.`updatedAt`, '%Y-%m-%dT%H:%i:%s.000Z')
)
WHERE active.`sceneSnapshot` IS NULL;
