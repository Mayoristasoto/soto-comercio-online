
CREATE TABLE public.gondolas_v2 (LIKE public.gondolas INCLUDING ALL);
CREATE TABLE public.graphic_elements_v2 (LIKE public.graphic_elements INCLUDING ALL);
CREATE TABLE public.layout_viewport_v2 (LIKE public.layout_viewport INCLUDING ALL);
CREATE TABLE public.brand_partners_v2 (LIKE public.brand_partners INCLUDING ALL);

GRANT SELECT ON public.gondolas_v2 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gondolas_v2 TO authenticated;
GRANT ALL ON public.gondolas_v2 TO service_role;
GRANT SELECT ON public.graphic_elements_v2 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.graphic_elements_v2 TO authenticated;
GRANT ALL ON public.graphic_elements_v2 TO service_role;
GRANT SELECT ON public.layout_viewport_v2 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.layout_viewport_v2 TO authenticated;
GRANT ALL ON public.layout_viewport_v2 TO service_role;
GRANT SELECT ON public.brand_partners_v2 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_partners_v2 TO authenticated;
GRANT ALL ON public.brand_partners_v2 TO service_role;

ALTER TABLE public.gondolas_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graphic_elements_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layout_viewport_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_partners_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_view_gondolas_v2" ON public.gondolas_v2 FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gondolas_v2_insert_admin_manager" ON public.gondolas_v2 FOR INSERT TO authenticated WITH CHECK (is_admin_or_manager());
CREATE POLICY "gondolas_v2_update_admin_manager" ON public.gondolas_v2 FOR UPDATE TO authenticated USING (is_admin_or_manager()) WITH CHECK (is_admin_or_manager());
CREATE POLICY "gondolas_v2_delete_admin_manager" ON public.gondolas_v2 FOR DELETE TO authenticated USING (is_admin_or_manager());

CREATE POLICY "Authenticated users can manage elements v2" ON public.graphic_elements_v2 FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Public can view visible elements v2" ON public.graphic_elements_v2 FOR SELECT USING (is_visible = true);

CREATE POLICY "Authenticated users can manage viewport v2" ON public.layout_viewport_v2 FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Public can view active viewport v2" ON public.layout_viewport_v2 FOR SELECT USING (is_active = true);

CREATE POLICY "Admin RRHH can manage brands v2" ON public.brand_partners_v2 FOR ALL TO authenticated USING (current_user_is_admin()) WITH CHECK (current_user_is_admin());
CREATE POLICY "Anyone can view brand partners v2" ON public.brand_partners_v2 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Brands v2 are publicly viewable" ON public.brand_partners_v2 FOR SELECT USING (is_active = true);
