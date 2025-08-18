import { RegistrationForm } from "@/components/RegistrationForm";

const Registration = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-event-primary/10 via-background to-event-secondary/10 py-6 px-2 sm:px-4">
      <div className="w-full max-w-lg sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto">
        <RegistrationForm />
      </div>
    </div>
  );
};

export default Registration;
