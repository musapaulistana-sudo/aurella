-- Corrige identidade legal / contato da Atlas Cosmeticos (sem acentos em fantasia e razão social).
UPDATE site_settings
SET
  store_name = 'Atlas Cosmeticos',
  company_legal_name = 'ATLAS NEGOCIOS INTEGRADOS LTDA',
  cnpj = '67.006.230/0001-39',
  contact_email = 'atendimento@atlascosmeticos.com',
  contact_address = 'Avenida Portugal, 1148 - Quadra L29 Lote 1E Sala C2501 - Set. Marista - Goiânia - Goiás, CEP: 74150-030',
  store_street = 'Avenida Portugal',
  store_street_number = '1148',
  store_complement = 'Quadra L29 Lote 1E Sala C2501',
  store_neighborhood = 'Set. Marista',
  store_city = 'Goiânia',
  store_state = 'GO',
  store_postal_code = '74150-030',
  phone_area_code = '62',
  phone_number = '9601-3205',
  phone_href = 'tel:+5562996013205',
  seo_title = 'Atlas Cosmeticos',
  seo_title_template = '%s | Atlas Cosmeticos',
  seo_description = replace(
    COALESCE(
      NULLIF(trim(seo_description), ''),
      'A Atlas Cosmeticos é uma loja virtual especializada em produtos de beleza e cuidados pessoais, com atendimento dedicado e compra 100% online.'
    ),
    'Atlas Cosméticos',
    'Atlas Cosmeticos'
  )
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Normaliza menções com acento incorreto no conteúdo das páginas institucionais/políticas.
UPDATE footer_pages
SET content = replace(content, 'Atlas Cosméticos', 'Atlas Cosmeticos')
WHERE content LIKE '%Atlas Cosméticos%';

UPDATE footer_pages
SET content = replace(content, 'ATLAS NEGÓCIOS INTEGRADOS LTDA', 'ATLAS NEGOCIOS INTEGRADOS LTDA')
WHERE content LIKE '%ATLAS NEGÓCIOS INTEGRADOS LTDA%';
