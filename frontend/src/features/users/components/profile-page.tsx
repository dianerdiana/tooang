import { useState } from 'react';

import { SaveIcon } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layouts/page-header';
import { SectionCard } from '@/components/layouts/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { getSafeMutationError } from '@/utils/dashboard-error';
import { useAuth } from '@/utils/hooks/use-auth';

import { useUpdateProfileMutation } from '../queries/users.mutation';
import { updateProfileSchema } from '../schemas/users.schema';

export function ProfilePage() {
  const { user } = useAuth();
  const mutation = useUpdateProfileMutation();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [error, setError] = useState<string>();
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(undefined);
    const parsed = updateProfileSchema.safeParse({ fullName, email });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message);
    try {
      const updated = await mutation.mutateAsync(parsed.data);
      setFullName(updated.fullName);
      setEmail(updated.email);
      toast.success('Profile updated.');
    } catch (mutationError) {
      setError(getSafeMutationError(mutationError, 'Unable to update your profile.'));
    }
  };

  return (
    <>
      <PageHeader title='Profile' description='Manage the personal information attached to your account.' />
      <SectionCard title='Personal information' description='Your email address is also used to sign in.'>
        <form className='grid max-w-xl gap-5' onSubmit={(event) => void submit(event)}>
          <label className='grid gap-1.5 text-sm font-medium'>
            Full name
            <Input
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete='name'
              disabled={mutation.isPending}
            />
          </label>
          <label className='grid gap-1.5 text-sm font-medium'>
            Email
            <Input
              type='email'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete='email'
              disabled={mutation.isPending}
            />
          </label>
          <div className='rounded-md bg-muted/60 p-3 text-sm text-muted-foreground'>
            Platform role: <span className='font-medium text-foreground'>{user?.platformRole}</span>
          </div>
          {error && (
            <p role='alert' className='text-sm text-destructive'>
              {error}
            </p>
          )}
          <Button
            type='submit'
            className='w-fit'
            disabled={mutation.isPending || (fullName === user?.fullName && email === user?.email)}
          >
            <SaveIcon />
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </SectionCard>
    </>
  );
}
