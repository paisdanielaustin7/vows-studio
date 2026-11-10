'use client';

import * as React from 'react';
import { UserProfile } from '@/types/auth';
import { updateSelfProfileAction, changePasswordAction } from '@/server/actions/user.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/specialized-inputs';
import { Banner } from '@/components/ui/feedback';
import { ShieldCheck, UserCheck, Key, Lock } from 'lucide-react';
import Link from 'next/link';

interface ProfileEditorProps {
  profile: UserProfile;
  aal: 'aal1' | 'aal2';
}

export function ProfileEditor({ profile, aal }: ProfileEditorProps) {
  const [fullName, setFullName] = React.useState(profile.fullName);
  const [phone, setPhone] = React.useState(profile.phone || '');
  const [profileMsg, setProfileMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Password fields
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmNewPassword, setConfirmNewPassword] = React.useState('');
  const [passwordMsg, setPasswordMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = React.useState(false);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setIsSavingProfile(true);

    try {
      const res = await updateSelfProfileAction({ fullName, phone });
      if (res.error) {
        setProfileMsg({ type: 'error', text: res.error.message });
      } else {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
      }
    } catch {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setIsSavingPassword(true);

    try {
      const res = await changePasswordAction({
        currentPassword,
        newPassword,
        confirmNewPassword,
      });

      if (res.error) {
        setPasswordMsg({ type: 'error', text: res.error.message });
      } else {
        setPasswordMsg({ type: 'success', text: 'Password successfully updated. All other active sessions have been invalidated.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch {
      setPasswordMsg({ type: 'error', text: 'Failed to change password.' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="pb-4 border-b border-outline-variant/30">
        <div className="text-xs uppercase tracking-widest text-outline font-semibold mb-1">
          Identity &amp; Security Settings
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
          My Profile &amp; Credentials
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage your personal studio contact information and authentication parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details */}
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
            <UserCheck className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-on-surface">Personal Information</h2>
          </div>

          {profileMsg && (
            <Banner
              variant={profileMsg.type === 'error' ? 'error' : 'info'}
              title={profileMsg.type === 'error' ? 'Update Failed' : 'Saved'}
            >
              {profileMsg.text}
            </Banner>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="profile-email">
                Email Address
              </label>
              <Input
                id="profile-email"
                disabled
                value={profile.email}
                className="opacity-70 bg-surface-container/40"
              />
              <span className="text-[11px] text-outline">
                Email is governed by System Administration.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="profile-name">
                Full Name
              </label>
              <Input
                id="profile-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="profile-phone">
                Phone Number (E.164)
              </label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
              />
            </div>

            <Button type="submit" disabled={isSavingProfile} className="w-full">
              {isSavingProfile ? 'Saving...' : 'Update Details'}
            </Button>
          </form>
        </div>

        {/* Security & Password */}
        <div className="space-y-6">
          {/* MFA Status Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-secondary" />
                <h2 className="text-base font-semibold text-on-surface">Two-Factor Security</h2>
              </div>
              <span className="text-xs font-mono font-bold text-secondary">
                {aal === 'aal2' ? 'ACTIVE (AAL2)' : 'ENROLLMENT RECOMMENDED'}
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              TOTP hardware or authenticator tokens protect your studio account from unauthorized access.
            </p>

            <Button asChild variant="outline" size="sm">
              <Link href="/mfa/enroll">Re-enroll or Setup MFA</Link>
            </Button>
          </div>

          {/* Change Password Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant/20">
              <Key className="w-5 h-5 text-primary" />
              <h2 className="text-base font-semibold text-on-surface">Change Password</h2>
            </div>

            {passwordMsg && (
              <Banner
                variant={passwordMsg.type === 'error' ? 'error' : 'info'}
                title={passwordMsg.type === 'error' ? 'Change Failed' : 'Success'}
              >
                {passwordMsg.text}
              </Banner>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="cur-pass">
                  Current Password
                </label>
                <Input
                  id="cur-pass"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="new-pass">
                  New Password (min 12 chars)
                </label>
                <Input
                  id="new-pass"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="conf-new-pass">
                  Confirm New Password
                </label>
                <Input
                  id="conf-new-pass"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={isSavingPassword || !currentPassword || !newPassword}
                className="w-full gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>{isSavingPassword ? 'Updating...' : 'Change Password'}</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
