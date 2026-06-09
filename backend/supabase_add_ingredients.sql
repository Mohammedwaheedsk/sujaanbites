alter table public.menu_items
add column if not exists ingredients text default '';

update public.menu_items
set ingredients = coalesce(ingredients, '');
