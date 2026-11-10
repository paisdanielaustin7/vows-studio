import { createClient } from '@supabase/supabase-js';
import { passwordRegex } from '../lib/validations/auth.schema';

async function bootstrapFirstAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
    process.exit(1);
  }

  const email = process.argv[2] || process.env.FIRST_ADMIN_EMAIL || 'admin@vowsstudio.com';
  const password = process.argv[3] || process.env.FIRST_ADMIN_PASSWORD || 'VowsAdmin2026!';
  const fullName = process.argv[4] || process.env.FIRST_ADMIN_NAME || 'System Administrator';

  if (!passwordRegex.test(password)) {
    console.error(
      'Error: Password does not meet security requirements (min 12 chars, upper, lower, digit, special).'
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Check if any system_admin already exists (DATABASE_SCHEMA §15 item 6)
  const { data: existingAdmin, error: checkError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('role', 'system_admin')
    .limit(1);

  if (checkError) {
    console.error('Error querying profiles table:', checkError.message);
    process.exit(1);
  }

  if (existingAdmin && existingAdmin.length > 0) {
    console.error(
      'Refusal Guard: A System Administrator already exists in the system (' +
        existingAdmin[0].email +
        '). Aborting.'
    );
    process.exit(1);
  }

  console.log(`Provisioning first system_admin (${email})...`);

  // 1. Create Supabase Auth User
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authUser.user) {
    console.error('Failed to create auth user:', authError?.message);
    process.exit(1);
  }

  // 2. Insert profile record with role = system_admin
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authUser.user.id,
    email,
    full_name: fullName,
    role: 'system_admin',
    is_active: true,
  });

  if (profileError) {
    console.error('Failed to create admin profile:', profileError.message);
    // Cleanup auth user on failure
    await supabase.auth.admin.deleteUser(authUser.user.id);
    process.exit(1);
  }

  // 3. Write initial audit log record
  await supabase.from('audit_log').insert({
    actor_user_id: authUser.user.id,
    actor_role: 'system_admin',
    action: 'create',
    table_name: 'profiles',
    record_id: authUser.user.id,
    new_values: { email, full_name: fullName, role: 'system_admin' },
    metadata: { reason: 'Initial system_admin bootstrap' },
  });

  console.log('✅ Successfully created initial System Administrator!');
  console.log(`Email: ${email}`);
  console.log('Note: TOTP MFA enrolment is mandatory at first login.');
}

bootstrapFirstAdmin().catch((err) => {
  console.error('Unexpected error bootstrapping admin:', err);
  process.exit(1);
});
