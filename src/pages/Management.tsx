import { RegistrationManagement } from "@/components/RegistrationManagement";

const Management = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-2 sm:py-8 px-1 sm:px-4">
      {/* 🔥 No mobile quase colado, no desktop centralizado */}
      <div className="container mx-auto px-1 sm:px-4">
        <RegistrationManagement />
      </div>
    </div>
  );
};

export default Management;
