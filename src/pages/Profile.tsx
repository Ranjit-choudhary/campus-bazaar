
import { supabase } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data?.user) {
        // The user object from supabase.auth.getUser() does not contain the role.
        // We need to fetch the user from the users table to get the role.
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (userData) {
          setUser({ ...data.user, ...userData });
        } else {
          setUser(data.user);
        }
      }
    };

    fetchUser();
  }, []);

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">User Profile</h1>
      {user && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>Role:</strong> {user.role}
            </p>
            {user.role === "admin" && (
              <Button onClick={() => navigate("/admin/dashboard")} className="mt-4">
                Go to Admin Dashboard
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;
