class UserLogin {
    signInEmailAddress: string;
    currentPassword: string;
    signInPassword: string;
    client_id: string;
    flow: string;
    flow_version: string;
    form: string;
    locale: string;
    redirect_uri: string;
    response_type: string;
    constructor({
        signInEmailAddress,
        currentPassword,
        signInPassword,
        client_id,
        flow,
        flow_version,
        form,
        locale,
        redirect_uri,
        response_type,
    }: {
        signInEmailAddress: string
        currentPassword: string
        signInPassword: string
        client_id: string
        flow: string
        flow_version: string
        form: string
        locale: string
        redirect_uri: string
        response_type: string
    }) {
        this.signInEmailAddress = signInEmailAddress
        this.currentPassword = currentPassword
        this.signInPassword = signInPassword
        this.client_id = client_id
        this.flow = flow
        this.flow_version = flow_version
        this.form = form
        this.locale = locale
        this.redirect_uri = redirect_uri
        this.response_type = response_type

        this.checkEmptyFields();
    }


    private checkEmptyFields(): void {
        const requiredFields = {
            signInEmailAddress: this.signInEmailAddress,
            currentPassword: this.currentPassword,
        }

        const emptyFields = Object.entries(requiredFields).filter(([_, value]) => !value || value.trim() === "");
        if(emptyFields.length > 0) {
            const firstNames = emptyFields.map(([key]) => key).join(", ");
            throw new Error(`The following fields cannot be empty: ${firstNames}`);
        }
    }
}

export default UserLogin;

