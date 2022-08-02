import aws_cdk as core
import aws_cdk.assertions as assertions

from 3_tier_vpc.3_tier_vpc_stack import 3TierVpcStack

# example tests. To run these tests, uncomment this file along with the example
# resource in 3_tier_vpc/3_tier_vpc_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = 3TierVpcStack(app, "3-tier-vpc")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
