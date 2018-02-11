import React from 'react';
import PropTypes from 'prop-types';
import { Wrapper } from 'modules/layout/components';
import { StepWrapper, TitleContainer } from './step/style';
import { FormControl } from 'modules/common/components';
import { ChannelStep, SegmentStep, MessageStep, Steps, Step } from './step';
import FormBase from './FormBase';

const propTypes = {
  segments: PropTypes.array.isRequired,
  templates: PropTypes.array,
  counts: PropTypes.object,
  segmentPush: PropTypes.func
};

class AutoAndManualForm extends FormBase {
  constructor(props) {
    super(props);

    this.state = {
      activeStep: 1,
      maxStep: 3,
      validate: {
        step1: false,
        step2: true,
        step3: true
      },
      method: 'email',
      title: '',
      segment: '',
      message: '',
      fromUser: '',
      messenger: {
        brandId: '',
        kind: '',
        sentAs: ''
      },
      email: {
        templateId: '',
        subject: ''
      }
    };

    this.next = this.next.bind(this);
    this.changeState = this.changeState.bind(this);
  }

  validate() {
    const step3 = this.state[this.state.method];
    let validate = { ...this.state.validate };
    validate['step2'] = false;
    validate['step3'] = false;

    if (this.state.segment === '') {
      validate['step2'] = true;
    }
    console.log(step3);
    Object.keys(step3).map(key => {
      if (step3[key] === '') {
        validate['step3'] = true;
        return false;
      }
    });

    this.setState({ validate });
  }

  generateDoc(e) {
    e.preventDefault();

    const doc = {
      segmentId: this.state.segment,
      title: this.state.title,
      fromUserId: this.state.fromUser,
      method: this.state.method
    };

    if (this.state.method === 'email') {
      doc.email = {
        templateId: this.state.email.templateId,
        subject: this.state.email.subject,
        content: this.state.message
      };
    } else if (this.state.method === 'messenger') {
      doc.messenger = {
        brandId: this.state.messenger.brandId,
        kind: this.state.messenger.kind,
        sentAs: this.state.messenger.sentAs,
        content: this.state.message
      };
    }

    return doc;
  }

  changeState(key, value) {
    this.setState({ [key]: value });
  }

  next(stepNumber) {
    const { activeStep, maxStep } = this.state;
    this.validate();

    if (stepNumber === 0) {
      if (activeStep <= maxStep) {
        this.setState({ activeStep: activeStep + 1 });
      }
    } else {
      this.setState({ activeStep: stepNumber });
    }
  }

  render() {
    const { activeStep, maxStep, validate } = this.state;
    const breadcrumb = this.renderTitle();
    return (
      <StepWrapper>
        <Wrapper.Header breadcrumb={breadcrumb} />
        <TitleContainer>
          <div>Title</div>
          <FormControl
            onChange={e => this.changeState('title', e.target.value)}
          />
        </TitleContainer>
        <Steps maxStep={maxStep} active={activeStep} validate={validate}>
          <Step
            img="/images/icons/erxes-05.svg"
            title="Choose channel"
            next={this.next}
          >
            <ChannelStep
              changeMethod={this.changeState}
              method={this.state.method}
            />
          </Step>
          <Step
            img="/images/icons/erxes-02.svg"
            title="Who is this message for?"
            next={this.next}
          >
            <SegmentStep
              changeSegment={this.changeState}
              segments={this.props.segments}
              counts={this.props.counts}
              segmentPush={this.props.segmentPush}
            />
          </Step>
          <Step
            img="/images/icons/erxes-08.svg"
            title="Compose your message"
            save={this.save}
            next={this.next}
            message={this.props.message}
          >
            <MessageStep
              brands={this.props.brands}
              changeState={this.changeState}
              message={this.state.message}
              users={this.props.users}
              method={this.state.method}
              templates={this.props.templates}
            />
          </Step>
        </Steps>
      </StepWrapper>
    );
  }
}

AutoAndManualForm.propTypes = propTypes;

export default AutoAndManualForm;
