import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Instagram, Twitter, Facebook } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsAndConditionsPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <Button variant="outline" onClick={() => navigate('/')} className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Home
                    </Button>
                    <div className="prose dark:prose-invert">
                        <h1>Terms and Conditions</h1>
                        <p>Last updated: August 23, 2025</p>

                        <p>Please read these terms and conditions carefully before using Our Service.</p>

                        <h2>Interpretation and Definitions</h2>
                        <h3>Interpretation</h3>
                        <p>The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>
                        <h3>Definitions</h3>
                        <p>For the purposes of these Terms and Conditions:</p>
                        <ul>
                            <li><strong>Company</strong> (referred to as either "the Company", "We", "Us" or "Our" in this Agreement) refers to Campus Bazaar.</li>
                            <li><strong>Service</strong> refers to the Website.</li>
                            <li><strong>Terms and Conditions</strong> (also referred as "Terms") mean these Terms and Conditions that form the entire agreement between You and the Company regarding the use of the Service.</li>
                            <li><strong>Website</strong> refers to Campus Bazaar, accessible from [Your Website URL]</li>
                            <li><strong>You</strong> means the individual accessing or using the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</li>
                        </ul>

                        <h2>Acknowledgment</h2>
                        <p>These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.</p>
                        <p>Your access to and use of the Service is conditioned on Your acceptance of and compliance with these Terms and Conditions. These Terms and Conditions apply to all visitors, users and others who access or use the Service.</p>
                        <p>By accessing or using the Service You agree to be bound by these Terms and Conditions. If You disagree with any part of these Terms and Conditions then You may not access the Service.</p>

                        <h2>Placing Orders for Goods</h2>
                        <p>By placing an order for Goods through the Service, You warrant that You are legally capable of entering into binding contracts.</p>

                        <h2>Payments</h2>
                        <p>All Goods purchased are subject to a one-time payment. Payment can be made through various payment methods we have available, such as UPI.</p>
                        <p>We reserve the right to refuse or cancel Your order at any time for certain reasons including but not limited to: Goods availability, errors in the description or prices for Goods, error in Your order.</p>

                        <h2>Changes to These Terms and Conditions</h2>
                        <p>We reserve the right, at Our sole discretion, to modify or replace these Terms at any time. If a revision is material We will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at Our sole discretion.</p>

                        <h2>Contact Us</h2>
                        <p>If you have any questions about these Terms and Conditions, You can contact us:</p>
                        <ul>
                            <li>By email: support@campusnooks.com</li>
                        </ul>
                    </div>
                </div>
            </div>
            <footer className="bg-card border-t border-border py-12 px-4 mt-8">
                <div className="container mx-auto text-center text-muted-foreground">
                    <p>&copy; 2025 Campus Bazaar. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default TermsAndConditionsPage;