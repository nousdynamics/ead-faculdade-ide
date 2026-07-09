-- Upload nativo de vídeo para depoimentos (checklist reunião 2026-07):
-- bucket cms-media passa a aceitar vídeo e arquivos de até 100 MB.
update storage.buckets
set file_size_limit = 104857600, -- 100 MB
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'video/mp4',
      'video/webm',
      'video/quicktime'
    ]
where id = 'cms-media';
