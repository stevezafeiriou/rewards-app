DROP POLICY IF EXISTS biz_media_upload ON storage.objects;
DROP POLICY IF EXISTS biz_media_manage ON storage.objects;
DROP POLICY IF EXISTS biz_media_delete ON storage.objects;

CREATE POLICY biz_media_upload
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY biz_media_manage
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY biz_media_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  );
