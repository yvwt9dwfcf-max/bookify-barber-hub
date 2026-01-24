-- Corrigir search_path da função update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- A política de INSERT em appointments com "true" é intencional pois clientes não logados
-- precisam conseguir criar agendamentos. Isso é seguro pois:
-- 1. Não há dados sensíveis sendo expostos na inserção
-- 2. A validação de conflitos é feita via lógica da aplicação
-- Este comentário documenta que a política permissiva é por design