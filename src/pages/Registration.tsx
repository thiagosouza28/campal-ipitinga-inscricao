import { RegistrationForm } from "@/components/RegistrationForm";

const Registration = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-event-primary/10 via-background to-event-secondary/10 py-8 px-4">
      <div className="container mx-auto">
        <RegistrationForm />
      </div>
    </div>
  );
};

export default Registration;